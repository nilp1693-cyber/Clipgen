/*
    ClipGen frontend
    -----------------

    अभी backend local machine पर:
        http://127.0.0.1:8000

    बाद में जब backend online होगा,
    सिर्फ API बदलना होगा.
*/

const API =
    "http://127.0.0.1:8000";


let selectedDuration = 15;

let verticalEnabled = true;

let captionsEnabled = true;


/* --------------------------------
   Duration selection
-------------------------------- */

function selectDuration(button) {

    document
        .querySelectorAll(
            ".option[data-duration]"
        )
        .forEach(item => {

            item.classList.remove(
                "active"
            );

        });


    button.classList.add("active");


    selectedDuration =
        Number(
            button.dataset.duration
        );
}


/* --------------------------------
   9:16 toggle
-------------------------------- */

function toggleVertical(button) {

    verticalEnabled =
        !verticalEnabled;


    button.classList.toggle(
        "active",
        verticalEnabled
    );
}


/* --------------------------------
   Captions toggle
-------------------------------- */

function toggleCaptions(button) {

    captionsEnabled =
        !captionsEnabled;


    button.classList.toggle(
        "active",
        captionsEnabled
    );
}


/* --------------------------------
   Generate
-------------------------------- */

async function generateClips() {

    const urlInput =
        document.getElementById(
            "videoUrl"
        );

    const status =
        document.getElementById(
            "status"
        );

    const clips =
        document.getElementById(
            "clips"
        );

    const button =
        document.getElementById(
            "generateButton"
        );


    const url =
        urlInput.value.trim();


    if (!url) {

        alert(
            "Please paste a video URL first."
        );

        return;
    }


    button.disabled = true;

    clips.innerHTML = "";

    status.classList.remove(
        "hidden"
    );


    try {

        /*
            STEP 1
            Download video
        */

        status.innerText =
            "⏳ Downloading video...";


        const downloadResponse =
            await fetch(
                `${API}/api/download`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            url: url
                        })
                }
            );


        const downloadData =
            await downloadResponse.json();


        if (!downloadResponse.ok) {

            throw new Error(
                downloadData.detail ||
                "Video download failed."
            );
        }


        /*
            STEP 2
            Generate highlights
        */

        status.innerText =
            "🎙️ Transcribing speech...\n" +
            "🎬 Detecting scene changes...\n" +
            "🧠 Finding highlights...";


        const clipResponse =
            await fetch(
                `${API}/api/generate-clips/${downloadData.job_id}`,
                {
                    method: "POST"
                }
            );


        const clipData =
            await clipResponse.json();


        if (!clipResponse.ok) {

            throw new Error(
                clipData.detail ||
                "Clip generation failed."
            );
        }


        /*
            STEP 3
            Show results
        */

        if (
            !clipData.clips ||
            clipData.clips.length === 0
        ) {

            status.innerText =
                "No highlights were detected.";

            return;
        }


        status.innerText =
            `🎉 ${clipData.count} clips generated!`;


        clips.innerHTML =
            clipData.clips
                .map(
                    clip => {

                        return `

                        <div class="clip">

                            <div class="clip-title">
                                🎬 Clip ${clip.id}
                            </div>

                            <div class="clip-info">

                                ⏱️
                                ${formatTime(
                                    clip.start
                                )}
                                -
                                ${formatTime(
                                    clip.end
                                )}

                                <br>

                                ⭐ Score:
                                ${clip.score}

                                <br>

                                💬
                                ${escapeHtml(
                                    clip.transcript
                                )}

                            </div>

                            <a
                                class="download-button"
                                href="${API}${clip.download_url}"
                                target="_blank"
                                download
                            >
                                ⬇️ Download MP4
                            </a>

                        </div>

                        `;
                    }
                )
                .join("");


    }
    catch (error) {

        console.error(error);


        status.innerText =
            "❌ " +
            error.message;
    }


    finally {

        button.disabled = false;
    }
}


/* --------------------------------
   Time formatter
-------------------------------- */

function formatTime(seconds) {

    const minutes =
        Math.floor(
            seconds / 60
        );


    const remainingSeconds =
        Math.floor(
            seconds % 60
        );


    return (
        minutes +
        ":" +
        remainingSeconds
            .toString()
            .padStart(2, "0")
    );
}


/* --------------------------------
   HTML escaping
-------------------------------- */

function escapeHtml(text) {

    return String(text)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}
