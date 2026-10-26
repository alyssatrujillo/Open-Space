# Open Space

A local team-process brief for the person running a meeting.

## What is in your folder

| File | Used by the prototype? |
|------|-------------------------|
| `Headcount_Team Charter Template.docx.pdf` | **Yes** — roster, WhatsApp channel, conflict path, customer mix from workplan (`data/team-from-upload.json` mirrors this) |
| `data/headcount-sample-meeting.txt` | **Sample only** — fictional beachhead meeting until you paste a real recording |
| Your recorded team meeting | **Not in folder yet** — paste, import, or record one in Open Space |

Open `index.html` through a local server (e.g. `python3 -m http.server 8756` in this folder) so the page can load `data/`. The design note is `DESIGN.md`.

## Deploy on Vercel (GitHub)

Repo: [github.com/alyssatrujillo/Open-Space](https://github.com/alyssatrujillo/Open-Space)

1. Sign in at [vercel.com](https://vercel.com) with the same GitHub account.
2. **Add New… → Project** → import **Open-Space**.
3. Leave **Build Command** empty and **Output Directory** as `.` (root).
4. **Deploy**. Later `git push` to `main` redeploys automatically.

Transcript format, also in `sample-transcript.txt`:

```
Maya: We should decide before we leave.
Jordan: The case numbers point the other way.
```

A Zoom `.vtt` transcript works too, if the speaker names match the roster.
