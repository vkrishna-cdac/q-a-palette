# Q&A Insights Hub

Build a browser-based Q&A/evaluation UI with XLSX/CSV input and output.

Home page must clearly show “Source Document”.
i hvae a total of 1000 questions and anwer which i need to show

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

make it clean, simple and highly aesthetic with professional light theme.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
