# Q&A Insights Hub

Build a browser-based Q&A/evaluation UI with XLSX/CSV input and output.

Home page must clearly show “Source Document”.
i hvae a total of 1000  questions and anwer which i need to show

in the home age only it should be divided into goods, works and services.
inside each section it shoul be divided section wise too according to the sections.

Flow: Source Document → Subject → Section → Questions.

Show questions, answers, and evaluation controls in a right-side panel.

Preserve only grounded/source content; no invented text.

Fix Q&A rendering: do not duplicate the answer/message and remove stray * characters.

Provide prominent Edit options for answers and CoT (Chain-of-Thought), with a small visual marker on edited questions.

Support 5-star rating, Like/Unlike, and comments.

Preserve citation/chunk info, e.g. “Chunk p.11–13 → Cited p.12 → Consultancy.”

Rename “extras” → “other” and “Unlabelled” → “Others”.

Hide clean score (e.g. 7.927) and average quality value.

Support XLSX and CSV import/export, including XLSX export.

make it clean, simple and highly asthetic with professional light theme.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://q-a-palette.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3aead27e-7ae5-43cc-86e4-742f8cfd70a3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
