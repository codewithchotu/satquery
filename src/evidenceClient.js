const FLORENCE_BASE =
  "https://gokaygokay-florence-2.hf.space";

const FLORENCE_FN_INDEX = 4;
const FLORENCE_MODEL =
  "microsoft/Florence-2-large";

const FLORENCE_TASK =
  "Referring Expression Segmentation";

const HF_TOKEN =
  import.meta.env.VITE_HF_TOKEN?.trim() || "";


// ============================================================
// BASIC VALIDATION
// ============================================================

function requireToken() {
  if (!HF_TOKEN) {
    throw new Error(
      "Hugging Face token is missing. " +
      "Make sure .env.local contains VITE_HF_TOKEN=hf_... " +
      "and restart Vite."
    );
  }
}


// ============================================================
// SESSION HASH
// ============================================================

function makeSessionHash() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    `satquery-${Date.now()}-` +
    Math.random().toString(36).slice(2)
  );
}


// ============================================================
// VISUAL TARGET ROUTING
// ============================================================

export function getVisualEvidenceTarget(question = "") {
  const q = String(question).toLowerCase();

  if (
    q.includes("water") ||
    q.includes("flood") ||
    q.includes("inundation") ||
    q.includes("river") ||
    q.includes("lake")
  ) {
    return "water bodies";
  }

  if (
    q.includes("built-up") ||
    q.includes("built up") ||
    q.includes("urban")
  ) {
    return "built-up areas";
  }

  if (
    q.includes("forest") ||
    q.includes("deforestation")
  ) {
    return "forest area";
  }

  if (
    q.includes("crop") ||
    q.includes("agriculture") ||
    q.includes("farmland") ||
    q.includes("vegetation")
  ) {
    return "agricultural / vegetation area";
  }

  if (
    q.includes("road") ||
    q.includes("roads")
  ) {
    return "roads";
  }

  if (
    q.includes("building") ||
    q.includes("buildings")
  ) {
    return "buildings";
  }

  return null;
}


// ============================================================
// SHOULD VISUAL EVIDENCE RUN?
// ============================================================

export function needsVisualEvidence(question = "") {
  const q = String(question).toLowerCase();

  const target =
    getVisualEvidenceTarget(q);

  if (!target) {
    return false;
  }

  const spatialIntent = [
    "where",
    "locate",
    "highlight",
    "show me",
    "show the",
    "show",
    "identify the",
    "point out",
    "outline",
    "segment",
    "mark",
    "find",
    "detect",
    "draw",
    "box",
    "bounding"
  ].some((term) =>
    q.includes(term)
  );

  return (
    spatialIntent ||
    q.includes("water body") ||
    q.includes("water bodies") ||
    q.includes("built-up") ||
    q.includes("built up") ||
    q.includes("roads") ||
    q.includes("buildings") ||
    q.includes("forest") ||
    q.includes("crop") ||
    q.includes("agriculture")
  );
}


// ============================================================
// EXTRACT PATH FROM FLORENCE UPLOAD RESPONSE
// ============================================================

function extractPath(uploadResult) {
  if (!uploadResult) {
    return null;
  }

  if (Array.isArray(uploadResult)) {
    return extractPath(
      uploadResult[0]
    );
  }

  if (typeof uploadResult === "string") {
    return uploadResult;
  }

  if (typeof uploadResult === "object") {
    return (
      uploadResult.path ||
      uploadResult.name ||
      uploadResult.url ||
      uploadResult._path ||
      null
    );
  }

  return null;
}


// ============================================================
// FILE DATA FORMAT EXPECTED BY GRADIO
// ============================================================

function toFileData(path, file) {
  return {
    path,

    orig_name:
      file.name ||
      "satellite-image.jpg",

    size:
      file.size || 0,

    mime_type:
      file.type || null,

    is_stream: false,

    meta: {
      _type: "gradio.FileData"
    }
  };
}


// ============================================================
// COMMON AUTH HEADERS
// ============================================================

function authHeaders(extra = {}) {
  requireToken();

  return {
    Authorization:
      `Bearer ${HF_TOKEN}`,

    ...extra
  };
}


// ============================================================
// UPLOAD IMAGE TO FLORENCE
// ============================================================

async function uploadToFlorence(file) {
  requireToken();

  const form = new FormData();

  form.append(
    "files",
    file,
    file.name || "satellite-image.jpg"
  );

  console.log("Florence: uploading image...");

  const response = await fetch(
    `${FLORENCE_BASE}/upload`,
    {
      method: "POST",
      headers: authHeaders(),
      body: form
    }
  );

  if (!response.ok) {
    const body =
      await response.text().catch(() => "");

    throw new Error(
      `Florence upload failed (${response.status})` +
      `${body ? `: ${body.slice(0, 500)}` : ""}`
    );
  }

  const result = await response.json();

  const path = extractPath(result);

  if (!path) {
    throw new Error(
      "Florence image upload succeeded but no file path was returned."
    );
  }

  console.log(
    "Florence upload complete:",
    path
  );

  return path;
}


// ============================================================
// WAIT FOR FLORENCE QUEUE RESULT
// ============================================================

async function waitForFlorence(
  sessionHash
) {
  console.log(
    "Florence: waiting for inference..."
  );

  const response = await fetch(
    `${FLORENCE_BASE}/queue/data` +
    `?session_hash=${encodeURIComponent(sessionHash)}`,
    {
      method: "GET",

      headers: authHeaders({
        Accept: "text/event-stream"
      })
    }
  );

  if (!response.ok) {
    const body =
      await response.text()
        .catch(() => "");

    throw new Error(
      `Florence queue stream failed ` +
      `(${response.status})` +
      `${body
        ? `: ${body.slice(0, 500)}`
        : ""}`
    );
  }

  if (!response.body) {
    throw new Error(
      "Florence queue returned no stream."
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let buffer = "";

  while (true) {
    const {
      value,
      done
    } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(
      value,
      { stream: true }
    );

    const blocks =
      buffer.split("\n\n");

    buffer =
      blocks.pop() || "";

    for (const block of blocks) {

      const dataLine =
        block
          .split("\n")
          .find((line) =>
            line.startsWith("data:")
          );

      if (!dataLine) {
        continue;
      }

      const jsonText =
        dataLine
          .slice(5)
          .trim();

      if (!jsonText) {
        continue;
      }

      let message;

      try {
        message =
          JSON.parse(jsonText);
      } catch {
        continue;
      }

      if (!message) {
        continue;
      }


      // ------------------------------------------------------
      // QUOTA ERROR
      // ------------------------------------------------------

      if (
        message.msg === "quota_exceeded" ||
        message.code === "quota_exceeded"
      ) {
        throw new Error(
          message.error ||
          message.message ||
          "Florence ZeroGPU quota exceeded."
        );
      }


      // ------------------------------------------------------
      // QUEUE FULL
      // ------------------------------------------------------

      if (
        message.msg === "queue_full"
      ) {
        throw new Error(
          "Florence visual-evidence queue is full."
        );
      }


      // ------------------------------------------------------
      // GENERIC ERROR
      // ------------------------------------------------------

      if (
        message.msg ===
        "unexpected_error"
      ) {
        throw new Error(
          message.error ||
          message.message ||
          "Florence returned an unexpected error."
        );
      }


      // ------------------------------------------------------
      // PROCESS COMPLETED
      // ------------------------------------------------------

      if (
        message.msg ===
        "process_completed"
      ) {
        if (
          message.success === false
        ) {
          throw new Error(
            message.output?.error ||
            message.error ||
            "Florence inference failed."
          );
        }

        console.log(
          "Florence inference completed."
        );

        return (
          message.output?.data ||
          []
        );
      }


      // ------------------------------------------------------
      // SERVER FAILURE
      // ------------------------------------------------------

      if (
        message.msg ===
        "server_stopped"
      ) {
        throw new Error(
          "Florence Space stopped unexpectedly."
        );
      }

      if (
        message.msg ===
        "close_stream"
      ) {
        return null;
      }
    }
  }

  throw new Error(
    "Florence stream ended before " +
    "a completed result was received."
  );
}


// ============================================================
// SUBMIT FLORENCE JOB
// ============================================================

async function runFlorence(
  file,
  target
) {
  requireToken();

  // ----------------------------------------------------------
  // Upload
  // ----------------------------------------------------------

  const uploadedPath =
    await uploadToFlorence(file);


  // ----------------------------------------------------------
  // Session
  // ----------------------------------------------------------

  const sessionHash =
    makeSessionHash();


  // ----------------------------------------------------------
  // EXACT FLORENCE PROCESS_IMAGE INPUTS
  //
  // process_image(
  //     image,
  //     task_prompt,
  //     text_input,
  //     model_id
  // )
  // ----------------------------------------------------------

  const inputData = [
    toFileData(
      uploadedPath,
      file
    ),

    FLORENCE_TASK,

    target,

    FLORENCE_MODEL
  ];


  console.log(
    "Florence request:",
    {
      fnIndex:
        FLORENCE_FN_INDEX,

      task:
        FLORENCE_TASK,

      target,

      model:
        FLORENCE_MODEL,

      authenticated:
        Boolean(HF_TOKEN)
    }
  );


  // ----------------------------------------------------------
  // Submit to legacy Gradio queue endpoint.
  //
  // We deliberately DO NOT call Client.connect().
  // Therefore /info is never requested.
  // ----------------------------------------------------------

  const joinResponse =
    await fetch(
      `${FLORENCE_BASE}/queue/join`,
      {
        method: "POST",

        headers: authHeaders({
          "Content-Type":
            "application/json"
        }),

        body: JSON.stringify({
          data: inputData,

          fn_index:
            FLORENCE_FN_INDEX,

          session_hash:
            sessionHash
        })
      }
    );


  if (!joinResponse.ok) {
    const body =
      await joinResponse.text()
        .catch(() => "");

    throw new Error(
      `Florence queue join failed ` +
      `(${joinResponse.status})` +
      `${body
        ? `: ${body.slice(0, 700)}`
        : ""}`
    );
  }


  const joinData =
    await joinResponse.json();


  console.log(
    "Florence queue joined:",
    joinData
  );


  if (!joinData?.event_id) {
    throw new Error(
      "Florence queue did not return an event ID."
    );
  }


  // ----------------------------------------------------------
  // Wait for actual result.
  // ----------------------------------------------------------

  return waitForFlorence(
    sessionHash
  );
}


// ============================================================
// EXTRACT IMAGE URL
// ============================================================

function extractImageUrl(
  value
) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    for (const item of value) {

      const found =
        extractImageUrl(item);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (
    typeof value === "object"
  ) {
    return (
      value.url ||
      value.path ||
      value._path ||
      value.name ||
      null
    );
  }

  return null;
}


// ============================================================
// COUNT REGIONS
// ============================================================

function deriveRegionCount(
  raw
) {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return 0;
  }

  const polygons =
    Array.isArray(raw.polygons)
      ? raw.polygons.length
      : 0;

  const boxes =
    Array.isArray(raw.bboxes)
      ? raw.bboxes.length
      : 0;

  const labels =
    Array.isArray(raw.labels)
      ? raw.labels.length
      : 0;

  return Math.max(
    polygons,
    boxes,
    labels
  );
}


// ============================================================
// MAIN EXPORT
// ============================================================

export async function getVisualEvidence(
  file,
  question = ""
) {
  if (
    !(file instanceof File)
  ) {
    throw new Error(
      "No primary observation was supplied " +
      "to the visual evidence model."
    );
  }


  if (
    !needsVisualEvidence(
      question
    )
  ) {
    return null;
  }


  const target =
    getVisualEvidenceTarget(
      question
    );


  if (!target) {
    return null;
  }


  const startedAt =
    performance.now();


  try {

    requireToken();

    console.log(
      "Starting Florence visual evidence..."
    );

    console.log(
      "HF token present:",
      Boolean(HF_TOKEN)
    );

    console.log(
      "Target:",
      target
    );


    const outputData =
      await runFlorence(
        file,
        target
      );


    if (
      !Array.isArray(outputData)
    ) {
      throw new Error(
        "Florence returned an unexpected output format."
      );
    }


    // --------------------------------------------------------
    // Florence process_image returns:
    //
    // outputData[0] = structured result
    // outputData[1] = rendered evidence image
    // --------------------------------------------------------

    const rawResult =
      outputData[0] || null;

    const outputImage =
      outputData[1] || null;


    const imageUrl =
      extractImageUrl(
        outputImage
      );


    console.log(
      "Florence completed:",
      {
        rawResult,
        outputImage,
        imageUrl
      }
    );


    // --------------------------------------------------------
    // Main.jsx expects imageUrl to determine success.
    // Keep that contract unchanged.
    // --------------------------------------------------------

    if (!imageUrl) {
      throw new Error(
        "Florence completed but did not return " +
        "a visual evidence image."
      );
    }


    const regionCount =
      deriveRegionCount(
        rawResult
      );


    return {
      target,

      taskLabel:
        "Grounded region / segmentation",

      model:
        "Florence-2",

      raw:
        rawResult,

      imageUrl,

      regionCount,

      latencyMs:
        Math.round(
          performance.now() -
          startedAt
        )
    };

  } catch (error) {

    console.error(
      "Florence-2 visual evidence failed:",
      error
    );

    throw (
      error instanceof Error
        ? error
        : new Error(
            "Florence visual evidence request failed."
          )
    );
  }
}