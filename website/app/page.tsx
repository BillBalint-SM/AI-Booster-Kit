const workflowModes = [
  {
    number: "01",
    title: "Human-led",
    description: "Your team owns the direction. The platform keeps the shared contracts, evidence and next decisions visible.",
    tag: "Team refinement",
  },
  {
    number: "02",
    title: "Co-creation",
    description: "People and Agents shape the goal together, then choose the right recipe for refinement, research or implementation.",
    tag: "Human + Agent",
  },
  {
    number: "03",
    title: "Solo-assisted",
    description: "Start with an idea. The Controller helps clarify it, validate it and recommend a useful next unit without taking ownership away.",
    tag: "One person, more leverage",
  },
];

const recipes = [
  { title: "Quick Task Clarifier", type: "Lightweight", status: "Ready", copy: "A minimal activation package for a small, well-bounded task." },
  { title: "Research Sprint", type: "Focused", status: "Next", copy: "Parallel evidence gathering with a concise synthesis and clear unknowns." },
  { title: "Planning Studio", type: "Structured", status: "Next", copy: "Turn a validated goal into dependencies, relations, DoR, DoD and AC." },
  { title: "Debugging Loop", type: "Heavyweight", status: "Later", copy: "Modify, run, verify: a repeatable evidence-first loop for complex systems." },
];

const roadmap = [
  { label: "Shipped", title: "Foundation + Controller MVP", copy: "Shared contracts, workflow modes, evidence vocabulary and reasoned recommendations.", tone: "done" },
  { label: "Now", title: "Framework Library v1", copy: "Ready-to-use recipes with characteristic weights, prerequisites and fit rationale.", tone: "now" },
  { label: "Later", title: "Lifecycle + optional Sync", copy: "Activation, tuning, evolution and Jira–GitHub–Confluence traceability as opt-in capabilities.", tone: "later" },
];

export default function Home() {
  return (
    <main>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="brand-mark" href="#top" aria-label="AI Booster Kit home">
          <span className="brand-orbit" aria-hidden="true" />
          <span>AI Booster Kit</span>
        </a>
        <div className="nav-links">
          <a href="#operating-model">Operating model</a>
          <a href="#frameworks">Framework library</a>
          <a href="#roadmap">Roadmap</a>
        </div>
        <a className="nav-cta" href="#start">Explore the kit <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="hero section-shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" /> A modular capability platform for intentional Agent work</p>
          <h1>Build better with Agents. <em>Stay in control.</em></h1>
          <p className="hero-lede">AI Booster Kit helps teams discover, shape and use the right Agent or multi-Agent formation for the work in front of them — without turning the human workflow into a rigid machine.</p>
          <div className="hero-actions" id="start">
            <a className="button button-primary" href="#frameworks">See the framework library <span aria-hidden="true">→</span></a>
            <a className="text-link" href="#operating-model">Understand the model <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-proof" aria-label="Product principles">
            <span><i className="proof-dot proof-green" aria-hidden="true" /> Human outcome ownership</span>
            <span><i className="proof-dot proof-cyan" aria-hidden="true" /> Evidence-first decisions</span>
            <span><i className="proof-dot proof-violet" aria-hidden="true" /> Optional by design</span>
          </div>
        </div>
        <div className="hero-console" aria-label="Controller recommendation preview">
          <div className="console-topline"><span>CONTROLLER / LIVE VIEW</span><span className="console-online"><i aria-hidden="true" /> READY</span></div>
          <div className="console-title"><span className="signal-bars" aria-hidden="true"><i /><i /><i /></span><div><p className="console-kicker">Detected work shape</p><h2>Epic / Milestone refinement</h2></div></div>
          <div className="console-rule" />
          <div className="console-grid">
            <div><span>Confidence</span><strong>High</strong></div>
            <div><span>Complexity</span><strong>Heavy</strong></div>
            <div><span>Owner</span><strong>Human team</strong></div>
            <div><span>Evidence</span><strong>Required</strong></div>
          </div>
          <div className="recommendation"><div><span className="recommendation-label">RECOMMENDED RECIPE</span><strong>Planning Studio</strong><p>Relation graph + dependency map + interview option</p></div><span className="recommendation-arrow" aria-hidden="true">→</span></div>
          <div className="checkpoint"><span className="checkpoint-index">3</span><div><strong>Late human checkpoint</strong><p>Accept recommendation, choose another approach, or continue without Agent help.</p></div></div>
        </div>
      </section>

      <section className="signal-strip section-shell" aria-label="Platform status">
        <div><span className="signal-value">05</span><span className="signal-label">useful capabilities shipped</span></div>
        <div><span className="signal-value">03</span><span className="signal-label">workflow modes available</span></div>
        <div><span className="signal-value">01</span><span className="signal-label">next focus: recipe library</span></div>
        <div><span className="signal-value">100%</span><span className="signal-label">User activation remains opt-in</span></div>
      </section>

      <section className="section-shell content-section" id="operating-model">
        <div className="section-heading"><div><p className="section-kicker">01 / Operating model</p><h2>One platform. Different ways to work.</h2></div><p>The kit is a library of capabilities, not a mandatory process. Choose the depth that fits the work.</p></div>
        <div className="workflow-grid">{workflowModes.map((mode) => <article className="workflow-card" key={mode.number}><div className="card-topline"><span className="card-number">{mode.number}</span><span className="card-tag">{mode.tag}</span></div><h3>{mode.title}</h3><p>{mode.description}</p><a href="#frameworks" className="card-link">Find a recipe <span aria-hidden="true">→</span></a></article>)}</div>
      </section>

      <section className="principle-band section-shell">
        <div className="principle-mark" aria-hidden="true">↗</div>
        <div><p className="section-kicker">The platform principle</p><h2>Capability exists <span>≠</span> User must activate it.</h2><p>The Controller can notice a pattern and explain a useful recipe. The person or team always owns the decision, scope and outcome.</p></div>
        <a href="#frameworks" className="text-link">How recommendations work <span aria-hidden="true">→</span></a>
      </section>

      <section className="section-shell content-section" id="frameworks">
        <div className="section-heading"><div><p className="section-kicker">02 / Framework library</p><h2>Ready-to-use formations for real work.</h2></div><p>Each unit has a strong character: light or heavy, bounded or expansive, single-agent or multi-agent.</p></div>
        <div className="recipe-grid">{recipes.map((recipe) => <article className={`recipe-card recipe-${recipe.status.toLowerCase()}`} key={recipe.title}><div className="recipe-meta"><span>{recipe.type}</span><span className="recipe-status"><i aria-hidden="true" /> {recipe.status}</span></div><h3>{recipe.title}</h3><p>{recipe.copy}</p><div className="recipe-footer"><span>DoR · DoD · AC</span><span aria-hidden="true">→</span></div></article>)}</div>
        <div className="library-footer"><p><span className="library-mark" aria-hidden="true">⌘</span> New formations are added as independent puzzle pieces. Save them to your team library or use them temporarily for one session.</p><a className="text-link" href="#roadmap">View the full journey <span aria-hidden="true">→</span></a></div>
      </section>

      <section className="section-shell content-section roadmap-section" id="roadmap">
        <div className="section-heading"><div><p className="section-kicker">03 / Platform journey</p><h2>Useful now. Expanding with intent.</h2></div><p>Progress is tracked by capability maturity and evidence — not by how many documents or features exist.</p></div>
        <div className="roadmap-list">{roadmap.map((item, index) => <article className={`roadmap-item roadmap-${item.tone}`} key={item.title}><div className="roadmap-node" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span></div><div className="roadmap-body"><div className="roadmap-label">{item.label}</div><h3>{item.title}</h3><p>{item.copy}</p></div><div className="roadmap-state">{item.tone === "done" ? "MERGED" : item.tone === "now" ? "ACTIVE FOCUS" : "CORE / OPT-IN"}</div></article>)}</div>
      </section>

      <footer className="site-footer section-shell">
        <div className="footer-brand"><a className="brand-mark" href="#top"><span className="brand-orbit" aria-hidden="true" /><span>AI Booster Kit</span></a><p>A shared field for human-led, Agent-assisted work.</p></div>
        <div className="footer-links"><a href="#operating-model">Operating model</a><a href="#frameworks">Framework library</a><a href="#roadmap">Roadmap</a><a href="https://github.com/BillBalint-SM/AI-Booster-Kit" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a></div>
        <p className="footer-note">Designed for continuous evolution. Built for useful work.</p>
      </footer>
    </main>
  );
}
