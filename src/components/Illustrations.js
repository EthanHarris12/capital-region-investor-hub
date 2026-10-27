// ============================================
// LINE-ART ILLUSTRATIONS
// Every stroke uses pathLength="1" so the .draw animation (globals.css)
// can trace it in regardless of its real length. --d staggers the start.
// Primary strokes use the accent; detail strokes use the muted ink.
// ============================================

function P({ d, delay, muted, width, opacity }) {
  return (
    <path d={d} pathLength="1" className="draw" style={{ "--d": (delay || 0) + "s", opacity: opacity }}
      fill="none" stroke={muted ? "var(--b-gray-muted)" : "var(--b-accent)"} strokeWidth={width || (muted ? 1.2 : 1.6)}
      strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  );
}

function range(n) { return Array.from({ length: n }, function (_, i) { return i; }); }

// Albany / Troy skyline: Troy rowhouses, the State Capitol, The Egg,
// Corning Tower, the four Agency buildings, a walk-up, and the Hudson.
export function Skyline({ style, className }) {
  var river = "M0 232" + range(10).map(function () { return " c20 -5 60 5 80 0"; }).join("");
  return (
    <svg viewBox="0 0 800 244" className={className} style={{ display: "block", width: "100%", height: "auto", overflow: "visible", ...style }} aria-hidden="true">
      {/* Troy rowhouses */}
      <P d="M20 220V150h40v70M60 220V140h45v80M105 220V155h45v65" delay={0.1} />
      <P d="M16 150h48M56 140h53M101 155h53" delay={0.3} muted />
      {[[28, 160], [44, 160], [28, 185], [44, 185], [70, 152], [88, 152], [70, 178], [88, 178], [114, 166], [132, 166], [114, 190], [132, 190]].map(function (w, i) {
        return <P key={"r" + i} d={"M" + w[0] + " " + w[1] + "h9v13h-9z"} delay={0.5 + i * 0.03} muted />;
      })}
      {/* State Capitol */}
      <P d="M170 220V150h160v70" delay={0.2} />
      <P d="M222 150V112h56v38M222 112l28-22 28 22" delay={0.4} />
      <P d="M170 150V126h24v24M306 150V126h24v24M170 126l12-10 12 10M306 126l12-10 12 10" delay={0.5} />
      {range(9).map(function (i) {
        var x = 180 + i * 16.5;
        return <P key={"c" + i} d={"M" + x + " 210v-16a5 5 0 0 1 10 0v16"} delay={0.7 + i * 0.03} muted />;
      })}
      <P d="M240 140v-16a10 10 0 0 1 20 0v16" delay={0.9} muted />
      {/* The Egg */}
      <P d="M386 220V192M398 220V192" delay={0.35} />
      <P d="M360 170a32 22 0 1 0 64 0a32 22 0 1 0 -64 0" delay={0.45} />
      <P d="M372 220h40" delay={0.6} muted />
      {/* Corning Tower */}
      <P d="M440 220V40h40v180M460 40V20" delay={0.25} />
      {range(13).map(function (i) {
        return <P key={"f" + i} d={"M446 " + (54 + i * 12.5) + "h28"} delay={0.6 + i * 0.025} muted opacity={0.6} />;
      })}
      {/* Agency buildings */}
      <P d="M497 220V108h22v112M527 220V108h22v112M557 220V108h22v112M587 220V108h22v112" delay={0.3} />
      {range(4).map(function (b) {
        return <P key={"a" + b} d={range(7).map(function (i) { return "M" + (501 + b * 30) + " " + (122 + i * 13) + "h14"; }).join("")} delay={0.7 + b * 0.05} muted opacity={0.6} />;
      })}
      {/* Walk-up */}
      <P d="M634 220V128h84v92M628 128h96" delay={0.35} />
      {range(3).map(function (r) {
        return range(3).map(function (c) {
          return <P key={"w" + r + c} d={"M" + (646 + c * 24) + " " + (142 + r * 22) + "h12v14h-12z"} delay={0.8 + (r * 3 + c) * 0.03} muted />;
        });
      })}
      <P d="M668 220v-20h16v20" delay={1} muted />
      {/* Trees */}
      <P d="M748 220v-22M748 198a12 12 0 1 1 0.1 0M778 220v-16M778 204a9 9 0 1 1 0.1 0" delay={0.6} muted />
      {/* Ground + Hudson */}
      <P d="M0 220H800" delay={0} />
      <P d={river} delay={0.4} muted opacity={0.7} />
    </svg>
  );
}

var SMALL = {
  house: function () {
    return (<>
      <P d="M10 150h180" muted delay={0} />
      <P d="M40 150V82h120v68" delay={0.1} />
      <P d="M28 88L100 30l72 58" delay={0.25} />
      <P d="M130 53V36h14v28" delay={0.4} />
      <P d="M88 150v-38h24v38" delay={0.5} />
      <P d="M54 100h22v20H54zM124 100h22v20h-22zM65 100v20M135 100v20" muted delay={0.6} />
    </>);
  },
  multifamily: function () {
    return (<>
      <P d="M10 150h180" muted delay={0} />
      <P d="M50 150V30h100v120M44 30h112" delay={0.1} />
      {range(4).map(function (r) {
        return range(3).map(function (c) {
          return <P key={r + "-" + c} d={"M" + (62 + c * 28) + " " + (42 + r * 22) + "h16v14H" + (62 + c * 28) + "z"} muted delay={0.35 + (r * 3 + c) * 0.03} />;
        });
      })}
      <P d="M90 150v-18h20v18" delay={0.7} />
      <P d="M160 150V96h22v54M171 96v-8" muted delay={0.5} />
    </>);
  },
  money: function () {
    return (<>
      <P d="M10 150h180" muted delay={0} />
      <P d="M30 140a24 7 0 1 0 48 0a24 7 0 1 0 -48 0M30 140v-12M78 140v-12M30 128a24 7 0 1 0 48 0a24 7 0 1 0 -48 0M30 128v-12M78 128v-12M30 116a24 7 0 1 0 48 0a24 7 0 1 0 -48 0" delay={0.1} />
      <P d="M96 70h80v48H96z" delay={0.3} />
      <P d="M136 82v24M142 86c-2-3-10-4-11 1s11 4 11 9-9 5-12 1" muted delay={0.5} />
      <P d="M102 76h10M160 112h10" muted delay={0.6} />
      <P d="M36 90l24-24 14 14 30-30M96 50h8v8" delay={0.65} />
    </>);
  },
  growth: function () {
    return (<>
      <P d="M20 150h170M20 150V20" muted delay={0} />
      <P d="M40 150v-30M70 150v-48M100 150v-40M130 150v-70M160 150v-92" delay={0.15} width={2} />
      <P d="M40 112l30-22 30 8 30-34 30-24" delay={0.5} />
      <P d="M148 28l12-10 12 10v16h-24z" muted delay={0.8} />
    </>);
  },
  keys: function () {
    return (<>
      <P d="M10 150h180" muted delay={0} />
      <P d="M70 80a26 26 0 1 0 0.1 0" delay={0.1} />
      <P d="M86 100l70 40M132 126l10-16M146 134l8-12" delay={0.35} />
      <P d="M64 98a6 6 0 1 0 0.1 0" muted delay={0.6} />
    </>);
  },
  blueprint: function () {
    return (<>
      <P d="M20 20h160v120H20z" muted delay={0} />
      <P d="M20 80h70v60M90 80V20M90 110h90M130 20v60" delay={0.2} />
      <P d="M60 80a20 20 0 0 1 20 -20M90 96a14 14 0 0 1 14 14" muted delay={0.5} />
      <P d="M30 150h60M30 146v8M90 146v8" muted delay={0.7} />
    </>);
  },
};

export function Illustration({ name, size, style, className }) {
  var draw = SMALL[name] || SMALL.house;
  return (
    <svg viewBox="0 0 200 160" width={size || 160} height={(size || 160) * 0.8} className={className} style={{ display: "block", overflow: "visible", ...style }} aria-hidden="true">
      {draw()}
    </svg>
  );
}
