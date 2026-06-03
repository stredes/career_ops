# Mode: apply — Live Application Assistant

Interactive mode for when the candidate is filling out an application form in Chrome. It reads what is on the screen, loads the previous context of the job, and generates personalized responses for each form question.

## Requirements

- **Best with Playwright in visible mode**: In visible mode, the candidate sees the browser and Claude can interact with the page.
- **Without Playwright**: the candidate shares a screenshot or pastes the questions manually.

## Workflow

```text
1. DETECT      → Read active Chrome tab (screenshot/URL/title)
2. IDENTIFY    → Extract company + role from the page
3. SEARCH      → Match against existing reports in reports/
4. LOAD        → Read full report + Section G (if it exists)
5. COMPARE     → Does the role on screen match the one evaluated? If it changed → notify
6. ANALYZE     → Identify ALL visible form questions
7. GENERATE    → For each question, generate a personalized response
8. AUTO-FILL   → If the user asks for automated apply, fill safe fields in-browser
9. PRESENT     → Show formatted responses for copy-paste or final review
```

## Step 1 — Detect the job

**With Playwright:** Take a snapshot of the active page. Read title, URL, and visible content.

**Without Playwright:** Ask the candidate to:
- Share a screenshot of the form (Read tool can read images)
- Or paste the form questions as text
- Or say company + role so we can search for it

## Step 2 — Identify and search for context

1. Extract company name and role title from the page
2. Search in `reports/` by company name (case-insensitive grep)
3. If there is a match → load the full report
4. If there is a Section G → load previous draft answers as a base
5. If there is NO match → notify and offer to run a quick auto-pipeline

## Step 3 — Detect changes in the role

If the role on screen differs from the one evaluated:
- **Notify the candidate**: "The role has changed from [X] to [Y]. Do you want me to re-evaluate or adapt the responses to the new title?"
- **If adapt**: Adjust responses to the new role without re-evaluating
- **If re-evaluate**: Execute full A-F evaluation, update report, regenerate Section G
- **Update tracker**: Change role title in applications.md if applicable

## Step 4 — Analyze form questions

Identify ALL visible questions:
- Free text fields (cover letter, why this role, etc.)
- Dropdowns (how did you hear, work authorization, etc.)
- Yes/No (relocation, visa, etc.)
- Salary fields (range, expectation)
- Upload fields (resume, cover letter PDF)

Classify each question:
- **Already answered in Section G** → adapt the existing response
- **New question** → generate response from the report + cv.md

## Step 5 — Generate responses

### Question-answering guardrails

Application questions are formal candidate declarations. Treat every answer as something the candidate may need to defend in an interview.

Before filling any question:

1. Extract the exact question text and the exact field/control associated with it.
2. Classify the field as one of:
   - `safe_identity`: name, email, phone, LinkedIn, GitHub, location.
   - `safe_preference`: availability, modality, salary expectation, work authorization.
   - `evidence_based`: skills, years of experience, education, tools, languages.
   - `risk`: legal declarations, degree obtained, disability/inclusion status, EIRL/contractor acceptance, relocation, background checks, tests, seniority claims, exclusive requirements.
3. Fill `safe_identity` and `safe_preference` from `config/profile.yml`.
4. Fill `evidence_based` only if the value is directly supported by `cv.md`, `modes/_profile.md`, or `config/profile.yml`.
5. Never infer an answer from the page as a whole. The agent must map each answer to its own question label.
6. If a required answer is uncertain, leave the field blank and pause with a compact review instead of submitting.

**Hard stop questions:**

Pause before final submission if the form asks any of these and the answer is not explicit in the user's sources:

- "Do you have the required degree?", "titulo obtenido", "grado/licenciatura", or similar.
- Years of professional experience when the CV only supports academic/project experience.
- Senior-only claims such as team leadership, architecture ownership, production ownership, 3+ or 5+ years.
- Legal declarations, disability status, background checks, EIRL/honorarios/contractor terms, relocation, visa/sponsorship, exclusivity clauses.
- Tool-specific experience not present in the CV, e.g. SAP, ServiceNow, Kubernetes, Keycloak, Selenium, Appium, WMS/RF, advanced English.

**Conservative answer bank for Gian Lucas:**

Use these only when the exact question matches the meaning:

| Question type | Safe answer |
|---|---|
| Phone/email | `+56954764325 / gianlucassanmartin@gmail.com` |
| Location | `Santiago, Region Metropolitana, Chile` |
| Availability | `Disponibilidad inmediata` |
| Work authorization in Chile | `No requiere patrocinio en Chile` / `Si` |
| Currently working? | `Prefiero no responder` unless the user gave a current employment answer in this session |
| Salary junior support/dev/data | CLP `900000` to `1000000`; higher only when the posting publishes a higher range |
| Salary if posting publishes a clear amount | Use the published amount or the user's target range, whichever is more appropriate |
| Excel experience | `2` years only for general Excel/operational data use |
| SQL experience | `1` year for practical/project/academic use unless the question says professional production SQL |
| Python experience | `1` year for practical/project/academic use unless the question says professional production Python |
| JavaScript/TypeScript/React | `1` year for practical/project/academic use unless the question says professional production experience |
| QA/testing experience | `1` year only for functional/project testing; answer `0` or pause for professional QA automation |
| English level | `Basico (A2)` if free text; if choices are only None/Conversation/Professional/Native, pause before choosing |
| Degree obtained | `Tecnico en Laboratorio Clinico y Banco de Sangre` is completed; `Analista Programador` is `en curso`; pause if the role requires an obtained IT degree |
| Disability/inclusion status | Do not answer unless the user explicitly provides this information |
| EIRL/honorarios/contractor acceptance | Pause unless the user explicitly approves this contract type |

For yes/no questions:

- Answer `Yes/Si` only when the CV/profile explicitly supports the claim.
- Answer `No` when the CV/profile explicitly contradicts the claim.
- Pause when the truthful answer would need nuance, e.g. "basic/project experience", "academic only", or "in progress".

For free-text answers:

- Be honest about level: use phrases like `experiencia practica en proyectos`, `formacion en curso`, `nivel basico/intermedio`, `base transferible`, and `disponible para aprender`.
- Do not turn project or academic experience into professional employment experience.
- Keep answers within the form's character limit.

For each question, generate the response following:

1. **Report context**: Use proof points from block B, STAR stories from block F
2. **Previous Section G**: If a draft response exists, use it as a base and refine
3. **"I'm choosing you" tone**: Same auto-pipeline framework
4. **Specificity**: Reference something specific from the JD visible on screen
5. **career-ops proof point**: Include in "Additional info" if there is a field for it

**Output format:**

```text
## Responses for [Company] — [Role]

Based on: Report #NNN | Score: X.X/5 | Archetype: [type]

---

### 1. [Exact form question]
> [Response ready for copy-paste]

### 2. [Next question]
> [Response]

...

---

Notes:
- [Any observations about the role, changes, etc.]
- [Personalization suggestions the candidate should review]
```

## Step 6 — Automated simple application flow

Use this path when the candidate asks to apply automatically, especially for LinkedIn/Get on Board style flows labeled **"Solicitud sencilla"**, **"Easy Apply"**, **"Postulación sencilla"**, or close typo variants such as **"solicitud senciall"**.

1. Open the offer in Playwright visible mode.
2. Click only the non-final apply/start button:
   - Match labels like `Solicitud sencilla`, `Easy Apply`, `Postular`, `Solicitar`, `Enviar CV`, or `Candidatura`.
   - Do not treat `Enviar solicitud`, `Enviar postulación`, `Submit application`, `Send application`, `Finalizar`, or `Confirmar` as start buttons.
3. Fill obvious fields from `config/profile.yml`, `cv.md`, `_profile.md`, and the matched report:
   - Name, email, LinkedIn, GitHub/portfolio, location, modality, salary, availability.
   - Upload the generated CV PDF only if the file exists and the form asks for a resume/CV.
   - Fill free-text questions with the generated responses from Step 5.
4. For dropdowns, yes/no questions, or work authorization, answer only after mapping the exact label to the exact field and checking the guardrails above. Otherwise pause and ask the candidate.
5. Before the final submit button:
   - Default behavior: stop and show a compact final review for the candidate.
   - If the candidate explicitly said to send automatically in this session, click the final submit only after checking there are no unanswered required fields, no unexpected assessment/test, no paid submission, and no account creation or legal consent beyond normal application terms.
6. After submission, capture the visible confirmation text or URL when possible and proceed to post-apply.

Never submit if the form contains unknown legal declarations, false claims, required tests, unanswered required fields, salary below the configured minimum, or a role/company mismatch versus the evaluated report.

## Step 7 — Post-apply (optional)

If the candidate confirms that they submitted the application:
1. Update status in `applications.md` from "Evaluated" to "Applied"
2. Update Section G of the report with the final responses
3. Suggest next step: `/career-ops contacto` for LinkedIn outreach

## Scroll handling

If the form has more questions than the visible ones:
- Ask the candidate to scroll and share another screenshot
- Or paste the remaining questions
- Process in iterations until the entire form is covered
