export type XChunkedMediaKind = "image" | "gif" | "video";

type XProcessingInfo = {
  check_after_secs?: number;
  state?: string;
};

type XChunkedUploadDependencies = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

const X_UPLOAD_MAX_ATTEMPTS = 3;

function mediaCategoryForKind(kind: XChunkedMediaKind) {
  return kind === "video"
    ? "tweet_video"
    : kind === "gif"
      ? "tweet_gif"
      : "tweet_image";
}

function processingInfoFromResponse(text: string): XProcessingInfo | undefined {
  const json = JSON.parse(text) as {
    data?: { processing_info?: XProcessingInfo };
    processing_info?: XProcessingInfo;
  };

  return json.data?.processing_info ?? json.processing_info;
}

function retryableUploadStatus(status: number) {
  return status === 429 || status >= 500;
}

async function requestXUpload(
  label: string,
  request: () => Promise<Response>,
  wait: (ms: number) => Promise<void>,
) {
  let lastFailure: { status: number; text: string } | null = null;

  for (let attempt = 1; attempt <= X_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await request();
      const text = await response.text();

      if (response.ok) {
        return { response, text };
      }

      lastFailure = { status: response.status, text };

      if (
        !retryableUploadStatus(response.status) ||
        attempt === X_UPLOAD_MAX_ATTEMPTS
      ) {
        break;
      }
    } catch (error) {
      if (attempt === X_UPLOAD_MAX_ATTEMPTS) {
        throw new Error(
          `X media ${label} request failed after ${attempt} attempts: ${
            error instanceof Error ? error.message : "network error"
          }`,
        );
      }
    }

    await wait(1000 * 2 ** (attempt - 1));
  }

  if (!lastFailure) {
    throw new Error(`X media ${label} request failed.`);
  }

  throw new Error(
    `X media ${label} failed (${lastFailure.status}) after ${X_UPLOAD_MAX_ATTEMPTS} attempts: ${lastFailure.text.slice(0, 400)}`,
  );
}

export async function uploadXMediaChunked(
  input: {
    accessToken: string;
    bytes: Uint8Array;
    contentType: string;
    kind?: XChunkedMediaKind;
    uploadUrl: string;
  },
  dependencies: XChunkedUploadDependencies = {},
): Promise<string> {
  const fetchRequest = dependencies.fetch ?? fetch;
  const wait = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const mediaCategory = mediaCategoryForKind(input.kind ?? "image");

  const { text: initText } = await requestXUpload(
    "INIT",
    () =>
      fetchRequest(`${input.uploadUrl}/initialize`, {
        body: JSON.stringify({
          media_type: input.contentType,
          total_bytes: input.bytes.byteLength,
          media_category: mediaCategory,
        }),
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    wait,
  );

  const initJson = JSON.parse(initText) as {
    data?: { id?: string };
    media_id_string?: string;
  };
  const mediaId = initJson.data?.id?.trim() ?? initJson.media_id_string?.trim();

  if (!mediaId) {
    throw new Error("X media INIT did not return media_id_string.");
  }

  const encodedMediaId = encodeURIComponent(mediaId);
  const chunkSize = 4 * 1024 * 1024;
  let segmentIndex = 0;

  for (let offset = 0; offset < input.bytes.byteLength; offset += chunkSize) {
    const chunk = input.bytes.slice(offset, offset + chunkSize);
    await requestXUpload(
      "APPEND",
      () => {
        const form = new FormData();
        form.append("segment_index", String(segmentIndex));
        form.append(
          "media",
          new Blob([Buffer.from(chunk)], { type: input.contentType }),
          `ops-chunk-${segmentIndex}`,
        );

        return fetchRequest(`${input.uploadUrl}/${encodedMediaId}/append`, {
          body: form,
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
          },
          method: "POST",
        });
      },
      wait,
    );

    segmentIndex += 1;
  }

  const { text: finalizeText } = await requestXUpload(
    "FINALIZE",
    () =>
      fetchRequest(`${input.uploadUrl}/${encodedMediaId}/finalize`, {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
        },
        method: "POST",
      }),
    wait,
  );

  let processing = processingInfoFromResponse(finalizeText);

  for (let attempt = 0; attempt < 40 && processing; attempt += 1) {
    if (processing.state === "succeeded") {
      return mediaId;
    }

    if (processing.state === "failed") {
      throw new Error("X media processing failed after upload.");
    }

    await wait(Math.max(1, processing.check_after_secs ?? 2) * 1000);

    const statusUrl = new URL(input.uploadUrl);
    statusUrl.searchParams.set("command", "STATUS");
    statusUrl.searchParams.set("media_id", mediaId);

    const { text: statusText } = await requestXUpload(
      "STATUS",
      () =>
        fetchRequest(statusUrl, {
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
          },
          method: "GET",
        }),
      wait,
    );

    processing = processingInfoFromResponse(statusText);

    if (!processing) {
      return mediaId;
    }
  }

  return mediaId;
}
