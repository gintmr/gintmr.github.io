# LaTeX CV Template

A privacy-clean, single-file LaTeX CV template based on the layout of the academic CV on this site. It contains no personal information, institution names, advisor names, paper titles, logos, or external assets.

[View the PDF preview](cv-template-preview.pdf).

## Use

1. Download `main.tex` or clone this repository.
2. Open `main.tex` and replace each `[bracketed prompt]` with your own details.
3. Edit the personal-detail commands near the top: name, email, Scholar, website, and GitHub URLs. Remove any contact links you do not use.
4. Duplicate or delete the entry blocks under each section to fit your experience.
5. Compile with pdfLaTeX:

   ```sh
   pdflatex main.tex
   pdflatex main.tex
   ```

The second compile updates the total-page count in the footer. The template uses common TeX Live packages and does not require image or bibliography files. If you use Overleaf, upload `main.tex` and select **pdfLaTeX** as the compiler.

## Editing notes

- Keep the square-bracketed prompts as a checklist while editing, then remove any remaining prompts before sharing your CV.
- In the Publications section, replace the example DOI URL with a DOI or paper URL. Remove the link command if the work has no public link.
- Copy an existing `\CVRow{...}{...}` or publication / experience block to add entries.
- The name entered in `\CVName` is also used in the generated PDF title, author metadata, and page footer.
