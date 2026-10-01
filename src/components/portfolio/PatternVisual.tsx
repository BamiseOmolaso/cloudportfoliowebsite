import type { Pattern } from "@/content/portfolio";

/**
 * The small animated diagram on each pattern card. Plain SVG (SMIL
 * animation), so it renders on the server and needs no JavaScript.
 */
export default function PatternVisual({ pattern }: { pattern: Pattern }) {
  switch (pattern.visual) {
    case "three-tier":
      return (
        <svg
          viewBox="0 0 240 150"
          role="img"
          aria-label="Three layers with a request moving down through them"
        >
          <rect
            className="s-box"
            x="50"
            y="14"
            width="140"
            height="30"
            rx="5"
          />
          <text className="s-tx w" x="120" y="33" textAnchor="middle">
            Edge · load balancer
          </text>
          <rect
            className="s-hot"
            x="50"
            y="60"
            width="140"
            height="30"
            rx="5"
          />
          <text className="s-tx w" x="120" y="79" textAnchor="middle">
            App · Fargate
          </text>
          <rect
            className="s-box"
            x="50"
            y="106"
            width="140"
            height="30"
            rx="5"
          />
          <text className="s-tx w" x="120" y="125" textAnchor="middle">
            Data · RDS
          </text>
          <path className="s-ac flow" d="M120 44 V60 M120 90 V106" />
          <circle className="s-dot" r="3.5" cx="120" cy="14">
            <animate
              attributeName="cy"
              values="14;136;14"
              keyTimes="0;.5;1"
              dur="3.6s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      );

    case "iam":
      return (
        <div
          className="viz"
          role="img"
          aria-label="Two secrets the container may read are allowed; every other secret is denied"
        >
          {(pattern.rows ?? []).map((row, i) => (
            <div
              key={row.text}
              className={`pol ${row.ok ? "ok" : "no"}${i === 0 ? " blink" : ""}`}
            >
              <code>{row.text}</code>
              <span className="tick">{row.ok ? "allow" : "denied"}</span>
            </div>
          ))}
        </div>
      );

    case "oidc":
      return (
        <svg
          viewBox="0 0 240 150"
          role="img"
          aria-label="GitHub Actions exchanges a signed token for short-lived AWS credentials"
        >
          <rect className="s-box" x="8" y="55" width="62" height="40" rx="5" />
          <text className="s-tx w" x="39" y="72" textAnchor="middle">
            GitHub
          </text>
          <text className="s-tx" x="39" y="84" textAnchor="middle">
            Actions
          </text>
          <rect className="s-hot" x="89" y="55" width="62" height="40" rx="5" />
          <text className="s-tx w" x="120" y="72" textAnchor="middle">
            AWS STS
          </text>
          <text className="s-tx" x="120" y="84" textAnchor="middle">
            trust policy
          </text>
          <rect
            className="s-box"
            x="170"
            y="55"
            width="62"
            height="40"
            rx="5"
          />
          <text className="s-tx w" x="201" y="72" textAnchor="middle">
            IAM role
          </text>
          <text className="s-tx" x="201" y="84" textAnchor="middle">
            assumed
          </text>
          <path className="s-ac flow" d="M70 75 H89 M151 75 H170" />
          <text className="s-tx" x="79" y="48" textAnchor="middle">
            OIDC token
          </text>
          <text className="s-tx" x="160" y="48" textAnchor="middle">
            temp creds
          </text>
          <circle className="s-dot" r="3.5" cy="75">
            <animate
              attributeName="cx"
              values="70;201"
              dur="2.6s"
              repeatCount="indefinite"
            />
          </circle>
          <text className="s-tx" x="120" y="128" textAnchor="middle">
            no stored access keys
          </text>
        </svg>
      );

    case "environments":
      return (
        <svg
          viewBox="0 0 240 150"
          role="img"
          aria-label="One set of Terraform modules builds dev, staging and production"
        >
          <rect className="s-hot" x="10" y="52" width="62" height="46" rx="5" />
          <text className="s-tx w" x="41" y="73" textAnchor="middle">
            Terraform
          </text>
          <text className="s-tx" x="41" y="86" textAnchor="middle">
            modules
          </text>
          <path
            className="s-ac flow"
            d="M72 75 C96 75 96 28 122 28 M72 75 H122 M72 75 C96 75 96 122 122 122"
          />
          <rect
            className="s-box"
            x="122"
            y="12"
            width="112"
            height="32"
            rx="5"
          />
          <text className="s-tx w" x="178" y="32" textAnchor="middle">
            dev · automatic
          </text>
          <rect
            className="s-box"
            x="122"
            y="59"
            width="112"
            height="32"
            rx="5"
          />
          <text className="s-tx w" x="178" y="79" textAnchor="middle">
            staging · timer
          </text>
          <rect
            className="s-box"
            x="122"
            y="106"
            width="112"
            height="32"
            rx="5"
          />
          <text className="s-tx w" x="178" y="126" textAnchor="middle">
            prod · approval
          </text>
        </svg>
      );

    case "secrets":
      return (
        <svg
          viewBox="0 0 240 150"
          role="img"
          aria-label="Secrets flow from Secrets Manager into the running task and never into git"
        >
          <rect className="s-hot" x="10" y="30" width="78" height="40" rx="5" />
          <text className="s-tx w" x="49" y="48" textAnchor="middle">
            Secrets
          </text>
          <text className="s-tx" x="49" y="60" textAnchor="middle">
            Manager
          </text>
          <rect
            className="s-box"
            x="152"
            y="30"
            width="78"
            height="40"
            rx="5"
          />
          <text className="s-tx w" x="191" y="48" textAnchor="middle">
            ECS task
          </text>
          <text className="s-tx" x="191" y="60" textAnchor="middle">
            at start-up
          </text>
          <path className="s-ac flow" d="M88 50 H152" />
          <circle className="s-dot" r="3.5" cy="50">
            <animate
              attributeName="cx"
              values="88;152"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </circle>
          <rect className="s-box" x="76" y="96" width="88" height="34" rx="5" />
          <text className="s-tx" x="120" y="117" textAnchor="middle">
            git repository
          </text>
          <path className="s-bad" d="M70 90 L170 136" />
        </svg>
      );

    case "defence":
      return (
        <svg
          viewBox="0 0 240 150"
          role="img"
          aria-label="Requests pass a rate limit and validation before reaching the handler"
        >
          <path className="s-ln" d="M10 75 H230" />
          <rect className="s-box" x="30" y="55" width="46" height="40" rx="5" />
          <text className="s-tx w" x="53" y="79" textAnchor="middle">
            Rate
          </text>
          <rect className="s-box" x="97" y="55" width="46" height="40" rx="5" />
          <text className="s-tx w" x="120" y="79" textAnchor="middle">
            Zod
          </text>
          <rect
            className="s-hot"
            x="164"
            y="55"
            width="52"
            height="40"
            rx="5"
          />
          <text className="s-tx w" x="190" y="79" textAnchor="middle">
            Handler
          </text>
          <circle className="s-dot" r="3.5" cy="75">
            <animate
              attributeName="cx"
              values="10;190;190"
              keyTimes="0;.8;1"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="3.5" cy="75" fill="var(--bad)">
            <animate
              attributeName="cx"
              values="10;53"
              dur="3.2s"
              begin="1.6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;1;0"
              keyTimes="0;.9;1"
              dur="3.2s"
              begin="1.6s"
              repeatCount="indefinite"
            />
          </circle>
          <text className="s-tx" x="120" y="128" textAnchor="middle">
            Redis limits · Zod validates · DOMPurify cleans
          </text>
        </svg>
      );
  }
}
