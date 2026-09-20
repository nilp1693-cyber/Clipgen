import os
import re
import uuid
import shutil
import subprocess
from pathlib import Path

import yt_dlp

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent

WORK_DIR = BASE_DIR / "jobs"
WORK_DIR.mkdir(exist_ok=True)


app = FastAPI(
    title="ClipGen API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VideoRequest(BaseModel):
    url: str


def safe_id(value):
    return re.sub(
        r"[^a-zA-Z0-9_-]",
        "",
        value
    )


@app.get("/")
def home():
    return {
        "status": "ClipGen backend running",
        "message": "API is working"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok"
    }


@app.post("/api/download")
def download_video(
    request: VideoRequest
):

    url = request.url.strip()

    if not url.startswith(
        ("http://", "https://")
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid video URL"
        )

    job_id = uuid.uuid4().hex

    job_dir = WORK_DIR / job_id

    job_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    output = (
        job_dir /
        "source.%(ext)s"
    )

    options = {
        "outtmpl": str(output),

        "format":
            "bestvideo[height<=1080]"
            "+bestaudio/"
            "best[height<=1080]",

        "merge_output_format": "mp4",

        "noplaylist": True,

        "quiet": False
    }

    try:

        with yt_dlp.YoutubeDL(
            options
        ) as ydl:

            info = ydl.extract_info(
                url,
                download=True
            )

        files = list(
            job_dir.glob("source.*")
        )

        if not files:

            raise RuntimeError(
                "Downloaded video file was not found."
            )

        video_file = files[0]

        return {
            "success": True,

            "job_id": job_id,

            "filename":
                video_file.name,

            "title":
                info.get("title")
                or "Video",

            "duration":
                info.get("duration")
        }

    except Exception as e:

        shutil.rmtree(
            job_dir,
            ignore_errors=True
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.get(
    "/api/files/{job_id}/{filename}"
)
def get_file(
    job_id: str,
    filename: str
):

    job_id = safe_id(job_id)

    filename = os.path.basename(
        filename
    )

    path = (
        WORK_DIR
        / job_id
        / filename
    )

    if not path.exists():

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return FileResponse(
        path
    )
