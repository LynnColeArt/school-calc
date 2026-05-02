# Missouri High School Math Standards Research

Date: 2026-05-02

## Purpose

This note grounds the calculator project in Missouri high school math expectations, with a first pass at greater St. Louis district context. The main product risk is building a generic solver that produces correct answers but not the process notation, representations, and explanations expected in local coursework.

## Sources Checked

- Missouri DESE, Missouri Learning Standards: https://dese.mo.gov/college-career-readiness/curriculum/missouri-learning-standards
- Missouri DESE, Mathematics hub: https://dese.mo.gov/college-career-readiness/curriculum/mathematics
- Missouri DESE, Mathematics 6-12 standards PDF: https://dese.mo.gov/sites/dese/files/media/pdf/2026/04/curr-mls-standards-math-6-12-sboe-2016_AOD.pdf
- Missouri DESE, Algebra 1 expanded expectations PDF: https://dese.mo.gov/sites/dese/files/media/pdf/2021/04/curr-math-mls%20expanded-expectaions-algebra-1.pdf
- Missouri DESE, Geometry expanded expectations PDF: https://dese.mo.gov/sites/dese/files/media/pdf/2021/04/curr-math-mls%20expanded-expectaions-geometry.pdf
- Missouri DESE, Algebra 2 expanded expectations PDF: https://dese.mo.gov/sites/dese/files/media/pdf/2021/04/curr-math-mls%20expanded-expectaions-algebra-2.pdf
- Missouri DESE, Missouri Student Mathematical Practices PDF: https://dese.mo.gov/sites/dese/files/media/pdf/2025/04/MissouriStudentMathematicalPractices.pdf
- Missouri DESE, End-of-Course assessment page: https://dese.mo.gov/quality-schools/assessment/end-course
- Missouri DESE, EOC blueprints PDF: https://dese.mo.gov/sites/dese/files/media/pdf/2026/04/asmt-eoc-blueprints_AOD.pdf
- Rockwood School District, Math Pathways 6-12: https://www.rsdmo.org/learn/content-areas/math/math-pathways
- Kirkwood High School, Mathematics Course Offerings: https://khs.kirkwoodschools.org/family-resources/counseling-center/course-selection/course-description-book/mathematics-course-offerings
- Ladue School District, High School Math 9-12: https://www.ladueschools.net/departments/curriculum-instruction/content-areas/math/high-school
- Ladue School District, Math Priority Standards: https://www.ladueschools.net/departments/curriculum-instruction/content-areas/math/priority-standards
- Gateway STEM / SLPS, Mathematics pathway: https://stem.slps.org/academics/academics-majors/mathematics/mathematics

## Key Findings

Missouri's standards are the spine, but not the full local curriculum. DESE says the Missouri Learning Standards define grade and course expectations, while local districts choose curriculum, instructional strategies, materials, and textbooks. For this project, that means the engine should align to Missouri standard codes, but the emitted notation should be configurable by course, district, teacher, or assignment style.

The current Missouri math standards listed by DESE were approved April 19, 2016, implemented starting in the 2016-2017 school year, and assessed starting in 2017-2018. DESE's math hub currently links the 6-12 standards, Algebra 1/Geometry/Algebra 2 expanded expectations, mathematical practices, crosswalks, item specifications, EOC blueprints, and performance level descriptors.

The first product target should be Algebra 1, not all of high school math. Missouri requires Algebra I EOC completion before graduation, and if a student completed Algebra I EOC before high school, Algebra II becomes the required high school math accountability assessment. Local district pathways also converge on Algebra 1 -> Geometry -> Algebra 2, even when they offer accelerated or alternate routes.

The project should be a step-and-reasoning generator, not just a calculator. The Missouri practices emphasize sense-making, multiple representations, justification, modeling, precision, structure, and repeated reasoning. The Algebra 1 expanded expectations directly require students to understand solving equations as a reasoning process and explain why each transformed equation or inequality has the same solution set.

## Course Scope Map

| Course | Missouri standard families | What the app must eventually generate |
| --- | --- | --- |
| Algebra 1 | NQ, SSE, CED, REI, APR, IF, BF, LQE, DS | Equation-solving steps, equivalent expressions, graph/table/function notation, linear/quadratic/exponential models, systems, inequalities, data summaries |
| Geometry | CO, SRT, C, GPE, GMD, MG, CP | Proof-style reasoning, transformation sequences, similarity/congruence arguments, trig ratios, coordinate geometry, construction notes, probability notation |
| Algebra 2 | NQ, SSE, REI, APR, IF, BF, FM, DS | Radical/rational/log/exponential solving, extraneous solution checks, complex numbers, polynomial/rational operations, inverse/composite functions, transformations, normal data reasoning |

## Highest-Value Algebra 1 Targets

| Standard | Why it matters for the calculator |
| --- | --- |
| A1.REI.A.1 | Core "show your work" target: every equation/inequality step must be recorded as an equivalent transformation with a reason. |
| A1.REI.A.2 | Quadratic solving needs multiple method renderers: factoring, square root property, completing the square, quadratic formula, and method comparison. |
| A1.REI.B.3-B.5 | Systems require algebraic and graphical solution modes, including linear-combination justification. |
| A1.CED.A.1-A.4 | Word problems need equation creation, constraints, literal equation solving, and interpretation of variables/units. |
| A1.IF.A-C | Function notation, domain/range, tables, graphs, key features, and equivalent forms need first-class representations. |
| A1.LQE.A-B | Linear, quadratic, exponential, arithmetic sequence, and geometric sequence problems need modeling workflows, not just symbolic solving. |
| A1.DS.A | Data work needs plots, center/spread, two-way tables, regression-style models, slope/intercept interpretation, and correlation vs causation language. |

## Greater St. Louis District Signals

Rockwood publishes a 6-12 pathway that moves from Algebra 1 or AMPED to Geometry or honors Geometry, then Algebra 2 or honors Algebra 2, followed by Algebra 3, trigonometry, statistics, finite math, pre-calculus, AP statistics, or AP calculus.

Kirkwood requires at least three math credits for graduation, recommends a fourth year as an elective, and lists Algebra I, Geometry, Algebra II, Statistics, Discrete Math, Algebra III, Precalculus, Calculus, AP Calculus, and AP Statistics. Its Algebra I description includes real numbers, linear/quadratic equations, inequalities, graphing linear/exponential/quadratic functions, polynomial operations, algebraic fractions, irrational numbers, and real-life applications.

Ladue's high school pathway starts with Algebra I or Advanced Geometry, then Geometry/Algebra II/Pre-Calculus and advanced/AP routes. Its Algebra I description is especially aligned with this project: structure in expressions, polynomial/rational arithmetic, equation creation, equation-solving as reasoning, explaining reasoning, and graphical representation of equations and inequalities.

Ladue also publishes priority standards for Algebra I, Geometry, and Algebra II. The Algebra I priorities mirror the strongest calculator targets: expression structure, equation creation, quadratic solving methods, graphing equations/inequalities, function interpretation, and transformations.

Gateway STEM / SLPS shows local variation in course sequencing: one pathway has Algebra 1 in 9th grade, Algebra 2 in 10th, Geometry in 11th, and pre-college/college algebra in 12th; another stretches Algebra across Algebra AB/CD before Algebra 2 and Geometry; an honors path pairs honors Algebra 2 and honors Geometry in 10th grade.

## Implementation Implications

Build around a standards-indexed capability model:

- `course`: Algebra 1, Geometry, Algebra 2
- `standardCode`: for example `A1.REI.A.1`
- `problemType`: solve linear equation, solve quadratic by factoring, graph inequality, interpret function, prove triangle congruence
- `representation`: symbolic, table, graph, verbal, geometric diagram, data display
- `stepStyle`: terse homework notation, annotated reasoning, hint-only, teacher-profiled format

Separate the math engine from process notation:

- Parser and AST for expressions, equations, inequalities, functions, and units.
- Rewrite/solve rules that produce a proof trace, not just a final answer.
- Standards metadata that maps rules and problem templates to Missouri course expectations.
- Renderers for plain text, LaTeX, table/graph summaries, and later diagrams.
- Teacher/district style profiles layered over the same proof trace.

Start with this MVP slice:

1. Algebra 1 linear equations and inequalities in one variable.
2. Every transformation recorded with an operation and equivalence reason.
3. Output modes: homework notation, annotated explanation, and hint-next-step.
4. Tests keyed to `A1.REI.A.1`.

Then add:

1. Linear systems by substitution, elimination, and graphing.
2. Quadratics by factoring and square root property.
3. Function notation and graph/table/key-feature interpretation.
4. Quadratics by completing the square and quadratic formula.
5. Geometry proof notation as a separate renderer rather than an algebra extension.

## Open Research Questions

- Which exact course is the daughter taking now: Algebra 1, Geometry, Algebra 2, or an integrated/local variant?
- Does her teacher require two-column proof, flow proof, paragraph explanation, operation annotations beside equation steps, or another format?
- Does the class use Desmos, TI-84, DeltaMath, IXL, CPM, Illustrative Math, Big Ideas, Open Up, or a district-authored curriculum?
- Are assignments graded for exact notation, reasoning statements, final answer only, or all of the above?
- Can we collect 10-20 anonymized homework examples and build a notation profile from those?

## Product Principle

Correct math is necessary but not sufficient. The product should generate a standards-aligned chain of reasoning in the notation style the student is expected to write.
