export type XChunkedMediaKind = "image" | "gif" | "video";

type XProcessingInfo = {
  check_after_secs?: number;
  state?: string;
};

type XChunkedUploadDependencies = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

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

  const initResponse = await fetchRequest(`${input.uploadUrl}/initialize`, {
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
  });
  const initText = await initResponse.text();

  if (!initResponse.ok) {
    throw new Error(
      `X media INIT failed (${initResponse.status}): ${initText.slice(0, 400)}`,
    );
  }

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
    const form = new FormData();
    form.append("segment_index", String(segmentIndex));
    form.append(
      "media",
      new Blob([Buffer.from(chunk)], { type: input.contentType }),
      `ops-chunk-${segmentIndex}`,
    );

    const appendResponse = await fetchRequest(
      `${input.uploadUrl}/${encodedMediaId}/append`,
      {
        body: form,
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
        },
        method: "POST",
      },
    );

    if (!appendResponse.ok) {
      const appendText = await appendResponse.text();
      throw new Error(
        `X media APPEND failed (${appendResponse.status}): ${appendText.slice(0, 400)}`,
      );
    }

    segmentIndex += 1;
  }

  const finalizeResponse = await fetchRequest(
    `${input.uploadUrl}/${encodedMediaId}/finalize`,
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      method: "POST",
    },
  );
  const finalizeText = await finalizeResponse.text();

  if (!finalizeResponse.ok) {
    throw new Error(
      `X media FINALIZE failed (${finalizeResponse.status}): ${finalizeText.slice(0, 400)}`,
    );
  }

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

    const statusResponse = await fetchRequest(statusUrl, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      method: "GET",
    });
    const statusText = await statusResponse.text();

    if (!statusResponse.ok) {
      throw new Error(
        `X media STATUS failed (${statusResponse.status}): ${statusText.slice(0, 400)}`,
      );
    }

    processing = processingInfoFromResponse(statusText);

    if (!processing) {
      return mediaId;
    }
  }

  return mediaId;
}
