// Expense Tracker — page mockup generator.
// Writes one standalone HTML per screen into mockups/screens/ plus an index contact sheet.
// Run: node blueprints/designs/build.mjs
// Screenshot each file at 2x to produce mockups/png/*.png (see README.md).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCREENS_DIR = join(HERE, "mockups", "screens");
const INDEX = join(HERE, "mockups", "index.html");

/* ------------------------------------------------------------------ tokens */

const CSS = `
:root{
  --canvas:#F4F4F1; --surface:#FFFFFF; --surface2:#F2F2EF; --surface3:#EDEDE9;
  --ink:#121317; --inkOn:#FFFFFF; --solid:#121317; --solidFg:#FFFFFF;
  --text:#0F1115; --text2:#6C727B; --text3:#9AA0A8;
  --accent:#5B5BF7; --accent2:#8E6BF6; --accentSoft:#EEEEFE;
  --income:#12A150;
  --expense:#F0503F; --warning:#DE9A24; --danger:#F0503F;
  --hair:#EDEDE7;
  --cardBorder:transparent;
  --insightFrom:#F2F1FE; --insightTo:#FBF5FF;
  --tabBg:rgba(255,255,255,.9); --homebar:#0F1115;
  --shadow:0 10px 26px rgba(16,18,23,.07), 0 2px 5px rgba(16,18,23,.04);
  --shadowLift:0 18px 40px rgba(16,18,23,.13);
}
*{box-sizing:border-box;margin:0;padding:0}
html{background:#E8E7E2}
body{
  background:#E8E7E2; padding:24px; display:flex; align-items:flex-start; justify-content:center;
  font-family:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  color:var(--text); -webkit-font-smoothing:antialiased;
  font-optical-sizing:auto; font-feature-settings:"ss01" 1;
}
.phone{
  position:relative; width:390px; height:844px; background:var(--canvas); color:var(--text);
  border-radius:48px; overflow:hidden; display:flex; flex-direction:column;
  box-shadow:0 0 0 10px #0E1013, 0 26px 60px rgba(16,23,31,.28);
}
.statusbar{
  position:absolute; top:0; left:0; right:0; height:54px; z-index:6;
  display:flex; align-items:flex-end; justify-content:space-between;
  padding:0 28px 9px; font-size:13px; font-weight:600; letter-spacing:.1px;
}
.statusbar.light{color:#fff}
.sb-right{display:flex; align-items:center; gap:6px}
.bars{display:flex; align-items:flex-end; gap:2px; height:10px}
.bars i{display:block; width:3px; background:currentColor; border-radius:1px}
.bars i:nth-child(1){height:4px}.bars i:nth-child(2){height:6px}
.bars i:nth-child(3){height:8px}.bars i:nth-child(4){height:10px}
.batt{width:22px;height:11px;border:1.4px solid currentColor;border-radius:3px;position:relative;opacity:.9}
.batt::after{content:"";position:absolute;right:-4px;top:3px;width:2px;height:5px;background:currentColor;border-radius:0 1px 1px 0}
.batt::before{content:"";position:absolute;left:1.5px;top:1.5px;bottom:1.5px;width:14px;background:currentColor;border-radius:1.5px}
.screen{position:absolute;top:54px;left:0;right:0;bottom:0;display:flex;flex-direction:column;overflow:hidden}
.homebar{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;background:var(--homebar);opacity:.8;z-index:9}
.homebar.light{background:#fff;opacity:.65}

/* header */
.hdr{display:flex;align-items:center;justify-content:space-between;padding:4px 20px 0;height:48px}
.month{display:flex;align-items:center;gap:6px;font-size:15px;font-weight:600;letter-spacing:-.2px;color:var(--text2)}
.month .now{color:var(--text);font-size:17px;letter-spacing:-.4px}
.cbtn{width:38px;height:38px;border-radius:19px;background:var(--surface);border:1px solid var(--cardBorder);display:flex;align-items:center;justify-content:center;color:var(--text);box-shadow:var(--shadow)}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--text3)}
.h1{font-size:31px;font-weight:700;letter-spacing:-.9px;line-height:36px}
.title{font-size:31px;font-weight:700;letter-spacing:-.9px;line-height:36px}

/* cards */
.card{background:var(--surface);border:1px solid var(--cardBorder);border-radius:24px;padding:18px;box-shadow:var(--shadow)}
.card.tight{padding:6px 18px}
.sec{display:flex;align-items:center;justify-content:space-between;padding:16px 4px 8px;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:var(--text3)}
.sec .link{color:var(--accent);font-size:13px;font-weight:600;letter-spacing:-.1px;text-transform:none}

/* hero */
.hero{position:relative;overflow:hidden;border-radius:28px;background:var(--ink);color:var(--inkOn);padding:18px 20px 16px;box-shadow:var(--shadowLift)}
.hero::before{content:"";position:absolute;width:300px;height:300px;right:-110px;top:-170px;border-radius:50%;background:radial-gradient(circle,rgba(142,107,246,.85),rgba(91,91,247,0) 68%)}
.hero::after{content:"";position:absolute;width:220px;height:220px;left:-90px;bottom:-150px;border-radius:50%;background:radial-gradient(circle,rgba(91,91,247,.55),rgba(91,91,247,0) 70%)}
.hero>*{position:relative;z-index:1}
.hero .eyebrow{color:rgba(255,255,255,.55)}
.pill{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:13px;font-size:11.5px;font-weight:600;background:rgba(255,255,255,.13);color:#fff}
.pill.accent{background:var(--accentSoft);color:var(--accent)}
.pill.soft{background:var(--surface2);color:var(--text2)}
.hero-amt{font-size:52px;font-weight:700;letter-spacing:-1.8px;line-height:1;margin-top:10px;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:8px}
.hero-amt .unit{font-size:15px;font-weight:600;letter-spacing:-.2px;color:rgba(255,255,255,.55)}
.hero-sub{font-size:13px;color:rgba(255,255,255,.6);margin-top:10px;letter-spacing:-.1px}
.track{height:6px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}
.track>i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.hero .track{margin-top:14px}
.hero-foot{display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:rgba(255,255,255,.5);margin-top:10px}

/* icon tiles */
.tile{display:flex;align-items:center;justify-content:center;border-radius:14px;flex:0 0 auto}
.tone-iris{background:#EDECFE;color:#5145D8}
.tone-mint{background:#E5F6EC;color:#0E8A46}
.tone-amber{background:#FCF0DC;color:#B57612}
.tone-coral{background:#FDE9E5;color:#D8402E}
.tone-sky{background:#E6F1FD;color:#2A6FC4}
.tone-slate{background:#EDEDE9;color:#5C626B}

/* budget cards */
.hcards{display:flex;gap:10px;overflow:hidden;padding:2px 0 4px}
.bcard{flex:0 0 152px;background:var(--surface);border:1px solid var(--cardBorder);border-radius:22px;padding:14px;box-shadow:var(--shadow)}
.bcard .bname{font-size:13.5px;font-weight:600;letter-spacing:-.2px;margin-top:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bcard .bmeta{font-size:11.5px;color:var(--text3);margin-top:2px;font-variant-numeric:tabular-nums}
.grow .v,.pickrow .code,.dayhead .tot,.amt,.hero-amt{font-variant-numeric:tabular-nums}
.bcard .bar{margin-top:8px;height:5px;background:var(--surface3);border-radius:99px;overflow:hidden}
.bcard .bar>i{display:block;height:100%;border-radius:99px}
.bar{height:6px;background:var(--surface3);border-radius:99px;overflow:hidden}
.bar>i{display:block;height:100%;border-radius:99px;background:var(--accent)}

/* list rows */
.row{display:flex;align-items:center;gap:12px;padding:9px 0}
.row+.row{border-top:1px solid var(--hair)}
.meta{flex:1;min-width:0}
.t{font-size:15.5px;font-weight:600;letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s{font-size:12.5px;color:var(--text2);margin-top:2px;letter-spacing:-.1px}
.amt{font-size:15.5px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.amt .cur{font-size:11px;font-weight:600;color:var(--text3);margin-right:1px}
.exp{color:var(--text)}
.inc{color:var(--income)}

/* tabs */
.tabbar{
  position:absolute;left:16px;right:16px;bottom:16px;height:64px;z-index:5;
  background:var(--tabBg); backdrop-filter:blur(20px) saturate(1.4);
  border:1px solid var(--cardBorder);
  border-radius:32px; box-shadow:var(--shadow);
  display:flex; align-items:center; justify-content:space-between; padding:0 8px;
}
.tab{height:46px;min-width:52px;border-radius:23px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 8px;color:var(--text3)}
.tab.on{background:var(--solid);color:var(--solidFg);padding:0 16px}
.tab .lbl{display:none;font-size:12.5px;font-weight:600;letter-spacing:-.1px}
.tab.on .lbl{display:inline}
.fab{position:absolute;right:20px;bottom:96px;width:60px;height:60px;border-radius:30px;
  background:linear-gradient(150deg,var(--accent),var(--accent2));color:#fff;
  display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(91,91,247,.42);z-index:6}

/* inputs / rows */
.search{height:46px;border-radius:23px;background:var(--surface);border:1px solid var(--cardBorder);display:flex;align-items:center;gap:9px;padding:0 16px;color:var(--text3);font-size:14.5px;box-shadow:var(--shadow)}
.chips{display:flex;gap:8px;overflow:hidden}
.chip{height:34px;padding:0 14px;border-radius:17px;background:var(--surface);display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--text2);white-space:nowrap;box-shadow:0 1px 2px rgba(16,18,23,.05)}
.chip.on{background:var(--solid);color:var(--solidFg);box-shadow:0 6px 14px rgba(18,19,23,.18)}
.dayhead{display:flex;align-items:center;justify-content:space-between;padding:16px 6px 6px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text3)}
.dayhead .tot{font-size:12.5px;font-weight:600;letter-spacing:-.1px;color:var(--text2);text-transform:none;font-variant-numeric:tabular-nums}
.fieldrow{display:flex;align-items:center;justify-content:space-between;height:52px;font-size:15px;font-weight:500;letter-spacing:-.2px}
.fieldrow+.fieldrow{border-top:1px solid var(--hair)}
.fieldrow .chev{color:var(--text3);font-size:17px}
.fieldrow.muted{color:var(--text3);font-weight:500}
.glabel{padding:20px 6px 8px;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:var(--text3)}
.grow{height:52px;display:flex;align-items:center;gap:12px;font-size:15px;letter-spacing:-.2px}
.grow+.grow{border-top:1px solid var(--hair)}
.grow .v{margin-left:auto;display:flex;align-items:center;gap:6px;color:var(--text2);font-size:14px}

/* keypad + buttons */
.keys{display:grid;grid-template-columns:repeat(3,1fr);padding:0 26px}
.key{height:51px;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:500;letter-spacing:-.6px;font-variant-numeric:tabular-nums}
.btn{height:56px;border-radius:28px;background:var(--solid);color:var(--solidFg);display:flex;align-items:center;justify-content:center;
  font-size:16.5px;font-weight:600;letter-spacing:-.2px;box-shadow:0 12px 26px rgba(18,19,23,.2)}
.btn.accent{background:linear-gradient(150deg,var(--accent),var(--accent2));box-shadow:0 14px 30px rgba(91,91,247,.34)}
.btn.ghost{background:transparent;color:var(--accent);font-size:15px;height:46px;box-shadow:none}
.btn.danger{background:transparent;color:var(--danger);font-size:15px;height:46px;box-shadow:none}
.btn.white{background:#fff;color:var(--ink);box-shadow:0 14px 30px rgba(0,0,0,.3)}
.seg{display:flex;background:var(--surface2);border-radius:19px;padding:3px}
.seg>div{flex:1;height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:600;color:var(--text2);border-radius:16px;white-space:nowrap}
.seg>div.on{background:var(--solid);color:var(--solidFg)}

/* add sheet */
.namerow{height:50px;border-radius:18px;background:var(--surface);border:1px solid var(--cardBorder);display:flex;align-items:center;gap:9px;padding:0 14px;font-size:15px;color:var(--text3);box-shadow:var(--shadow)}
.namerow .val{color:var(--text);font-weight:600;letter-spacing:-.2px}
.namerow .caret{width:2px;height:19px;background:var(--accent);border-radius:1px;margin-left:1px}

/* region picker */
.pickgroup{background:var(--surface);border:1px solid var(--cardBorder);border-radius:24px;box-shadow:var(--shadow);overflow:hidden;padding:0 16px}
.pickrow{display:flex;align-items:center;gap:12px;height:56px;font-size:15px;letter-spacing:-.2px}
.pickrow+.pickrow{border-top:1px solid var(--hair)}
.pickrow .flag{font-size:10px;font-weight:700;letter-spacing:.4px;color:var(--text2);background:var(--surface3);border-radius:7px;padding:5px 6px;line-height:1;min-width:28px;text-align:center}
.pickrow .code{margin-left:auto;font-size:13px;color:var(--text2);font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:8px}

/* misc */
.insight{background:linear-gradient(140deg,var(--insightFrom),var(--insightTo));border:1px solid var(--cardBorder);border-radius:22px;padding:16px;display:flex;gap:11px;align-items:flex-start}
.truth{font-size:11px;color:var(--text3);letter-spacing:-.1px}

/* ---------------------------------------------------------------- dark theme */
[data-theme="dark"]{
  --canvas:#0B0C10; --surface:#15171C; --surface2:#1C1F25; --surface3:#23262D;
  --ink:#1A1C22; --inkOn:#F5F5F3; --solid:#F5F5F3; --solidFg:#0B0C10;
  --text:#F5F5F3; --text2:#A2A8B2; --text3:#6E747D;
  --accent:#8B8BFF; --accent2:#B49BFF; --accentSoft:#1E1E3A;
  --income:#3ECF7C;
  --expense:#FF7A6B; --warning:#F2B94B; --danger:#FF7A6B;
  --hair:#262A31;
  --cardBorder:rgba(255,255,255,.055);
  --insightFrom:#191A2C; --insightTo:#221B2E;
  --tabBg:rgba(21,23,28,.92); --homebar:#F5F5F3;
  --shadow:0 12px 28px rgba(0,0,0,.45), 0 2px 5px rgba(0,0,0,.3);
  --shadowLift:0 22px 48px rgba(0,0,0,.55);
}
[data-theme="dark"] .hero{box-shadow:0 22px 48px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.05)}
[data-theme="dark"] .hero::before{opacity:.9}
[data-theme="dark"] .tone-iris{background:#242245;color:#C3B8FF}
[data-theme="dark"] .tone-mint{background:#122A1D;color:#57D392}
[data-theme="dark"] .tone-amber{background:#2E2411;color:#F0BE63}
[data-theme="dark"] .tone-coral{background:#301A16;color:#FF9586}
[data-theme="dark"] .tone-sky{background:#142234;color:#7FB6F0}
[data-theme="dark"] .tone-slate{background:#22252C;color:#A9AFB9}
[data-theme="dark"] .chip:not(.on){box-shadow:none}
[data-theme="dark"] .chip.on{box-shadow:0 6px 16px rgba(0,0,0,.4)}
[data-theme="dark"] .btn{box-shadow:0 12px 26px rgba(0,0,0,.5)}
[data-theme="dark"] .btn.danger,[data-theme="dark"] .btn.ghost{box-shadow:none}
[data-theme="dark"] .fab{box-shadow:0 16px 34px rgba(91,91,247,.5)}
[data-theme="dark"] .flag{background:#23262D;color:#A2A8B2}
`;

/* ------------------------------------------------------------------- icons */

const PATHS = {
  home: '<path d="M3.6 10.7 12 3.8l8.4 6.9"/><path d="M5.8 9.6V20a1 1 0 0 0 1 1h3v-5.6h4.4V21h3a1 1 0 0 0 1-1V9.6"/>',
  list: '<path d="M4 6.5h16M4 12h16M4 17.5h10"/>',
  pie: '<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8V12h8.2"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/>',
  search: '<circle cx="11" cy="11" r="6.4"/><path d="m16 16 4.5 4.5"/>',
  sliders: '<path d="M4 7h9M19 7h1M4 17h3M13 17h7"/><circle cx="15.5" cy="7" r="2.2"/><circle cx="10.5" cy="17" r="2.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="m4 20 4.4-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z"/><path d="m14 6 4 4"/>',
  back: '<path d="m14.5 6-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  del: '<path d="M20 6H9l-5 6 5 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1Z"/><path d="m13 10 4 4M17 10l-4 4"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  bag: '<path d="M6 8h12l1.2 12H4.8L6 8Z"/><path d="M9 8V6.4a3 3 0 0 1 6 0V8"/>',
  fork: '<path d="M7 3v7a2 2 0 0 0 4 0V3"/><path d="M9 10v11"/><path d="M16.5 3c1.6 1.4 2.5 3.6 2.5 6 0 1.7-.9 2.6-2.5 2.6V21"/>',
  car: '<path d="M4 16.5V12l2-5h12l2 5v4.5"/><path d="M4 16.5h16"/><circle cx="7.5" cy="17.5" r="1.7"/><circle cx="16.5" cy="17.5" r="1.7"/><path d="M4 12h16"/>',
  cart: '<path d="M3 4h2.2l2.4 11.2h10.6L20 8H6.4"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
  bolt: '<path d="M13 2 4.5 13.2H11L10 22l8.5-11.2H12L13 2Z"/>',
  ticket: '<path d="M3 9.5V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 0 0 5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3.5a2.5 2.5 0 0 0 0-5Z"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z"/><path d="M16 12.5h3.5v4H16a2 2 0 0 1 0-4Z"/>',
  globe: '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.2 2.4 3.3 5.3 3.3 8.4s-1.1 6-3.3 8.4c-2.2-2.4-3.3-5.3-3.3-8.4S9.8 6 12 3.6Z"/>',
  layers: '<path d="m12 4 8 4.5-8 4.5-8-4.5L12 4Z"/><path d="m4 12.5 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/>',
};

const svg = (name, size = 22, sw = 1.7) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;

const statusBar = (light = false) => `
<div class="statusbar${light ? " light" : ""}">
  <span>9:41</span>
  <div class="sb-right">
    <div class="bars"><i></i><i></i><i></i><i></i></div>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <path d="M1.5 4.2a9.5 9.5 0 0 1 13 0"/><path d="M4 7a6 6 0 0 1 8 0"/><path d="M6.6 9.6a2.4 2.4 0 0 1 2.8 0"/>
    </svg>
    <div class="batt"></div>
  </div>
</div>`;

const TABS = [
  ["home", "Overview", "Home"],
  ["list", "Activity", "Transactions"],
  ["pie", "Budgets", "Budget"],
  ["chart", "Insights", "Insights"],
];

const tabbar = (active) => `
<div class="tabbar">
  ${TABS.map(
    ([ic, label, key]) =>
      `<div class="tab ${key === active ? "on" : ""}">${svg(ic, 21)}<span class="lbl">${label}</span></div>`
  ).join("")}
</div>`;

const tile = (icon, tone, size = 42) => `
  <div class="tile tone-${tone}" style="width:${size}px;height:${size}px;border-radius:${Math.round(
  size * 0.33
)}px">${svg(icon, Math.round(size * 0.46), 1.8)}</div>`;

const txRow = (icon, tone, title, sub, amount, cls = "exp") => `
  <div class="row">
    ${tile(icon, tone, 42)}
    <div class="meta"><div class="t">${title}</div><div class="s">${sub}</div></div>
    <span class="amt ${cls}">${amount}</span>
  </div>`;

const budgetCard = (icon, tone, name, meta, pct, fill) => `
  <div class="bcard">
    ${tile(icon, tone, 34)}
    <div class="bname">${name}</div>
    <div class="bmeta">${meta}</div>
    <div class="bar"><i style="width:${Math.min(pct, 100)}%;background:${fill}"></i></div>
  </div>`;

/* ----------------------------------------------------------------- screens */

const onboarding = `
<div class="screen" style="background:#0B0C10;color:#fff;overflow:hidden">
  <div style="position:absolute;width:420px;height:420px;left:50%;top:-190px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,rgba(142,107,246,.55),rgba(11,12,16,0) 66%)"></div>
  <div style="position:absolute;width:320px;height:320px;left:-130px;bottom:-80px;border-radius:50%;background:radial-gradient(circle,rgba(91,91,247,.42),rgba(11,12,16,0) 70%)"></div>
  <div style="position:relative;display:flex;justify-content:flex-end;padding:6px 22px 0;font-size:14px;font-weight:600;color:rgba(255,255,255,.45)">Skip</div>
  <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 28px">
    <div style="width:62px;height:62px;border-radius:20px;background:linear-gradient(150deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;box-shadow:0 18px 40px rgba(91,91,247,.45)">$</div>
    <div style="font-size:34px;line-height:39px;font-weight:700;letter-spacing:-1.1px;margin-top:26px">Know what's<br/>left, not just<br/>what's gone.</div>
    <div style="font-size:15px;line-height:22px;color:rgba(255,255,255,.55);margin-top:13px;max-width:280px">Track spending in seconds and see what you can safely spend today.</div>
    <div style="margin-top:26px;display:flex;flex-direction:column;gap:13px">
      ${[
        ["5-second entry", "Amount first. Everything else is optional."],
        ["Safe to spend, daily", "One number after bills and budgets."],
        ["Works offline", "Your data stays on this device."],
      ]
        .map(
          ([t, s]) => `
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:24px;height:24px;border-radius:12px;background:rgba(91,91,247,.22);color:#B7A6FF;display:flex;align-items:center;justify-content:center;flex:0 0 24px;margin-top:1px">${svg(
            "check",
            13,
            2.6
          )}</div>
          <div><div style="font-size:14px;font-weight:600;letter-spacing:-.2px">${t}</div><div style="font-size:12.5px;color:rgba(255,255,255,.45);margin-top:2px">${s}</div></div>
        </div>`
        )
        .join("")}
    </div>
  </div>
  <div style="position:relative;padding:0 22px 34px">
    <div style="display:flex;justify-content:center;gap:6px;margin-bottom:16px">
      <i style="display:block;width:18px;height:5px;border-radius:3px;background:#fff"></i>
      <i style="display:block;width:5px;height:5px;border-radius:3px;background:rgba(255,255,255,.25)"></i>
      <i style="display:block;width:5px;height:5px;border-radius:3px;background:rgba(255,255,255,.25)"></i>
    </div>
    <div class="btn white">Get started</div>
    <div style="height:46px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:rgba(255,255,255,.5)">Restore a backup</div>
  </div>
</div>`;

const onboardingCurrency = `
<div class="screen">
  <div style="display:flex;justify-content:center;padding:8px 0 0">
    <div style="display:flex;gap:6px">
      <i style="display:block;width:6px;height:6px;border-radius:3px;background:#D8D8D2"></i>
      <i style="display:block;width:20px;height:6px;border-radius:3px;background:var(--ink)"></i>
      <i style="display:block;width:6px;height:6px;border-radius:3px;background:#D8D8D2"></i>
    </div>
  </div>
  <div style="padding:20px 22px 0">
    <div class="eyebrow">Step 2 of 3</div>
    <div class="h1" style="margin-top:8px">Where do you<br/>spend?</div>
    <div style="font-size:14px;line-height:20px;color:var(--text2);margin-top:10px">Sets your currency, symbols and number format. Change it anytime.</div>
  </div>
  <div style="padding:16px 20px 0">
    <div style="display:flex;align-items:center;gap:12px;background:var(--ink);border-radius:22px;padding:14px 16px;color:#fff;box-shadow:var(--shadowLift)">
      <span class="flag" style="font-size:10px;font-weight:700;letter-spacing:.4px;background:rgba(255,255,255,.16);border-radius:7px;padding:5px 6px;min-width:28px;text-align:center">US</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:600;letter-spacing:-.3px">United States</div>
        <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:2px">USD $ · US Dollar</div>
      </div>
      <span style="color:#B7A6FF">${svg("check", 18, 2.6)}</span>
    </div>
    <div class="search" style="margin-top:12px">${svg("search", 18)}<span>Search country or currency</span></div>
    <div class="sec" style="padding:18px 4px 8px"><span>All countries</span></div>
    <div class="pickgroup">
      ${[
        ["GB", "United Kingdom", "GBP £"],
        ["JP", "Japan", "JPY ¥"],
        ["DE", "Germany", "EUR €"],
        ["KW", "Kuwait", "KWD د.ك"],
        ["IS", "Iceland", "ISK kr"],
      ]
        .map(
          ([f, n, c]) =>
            `<div class="pickrow"><span class="flag">${f}</span><span>${n}</span><span class="code">${c}</span></div>`
        )
        .join("")}
    </div>
  </div>
  <div style="margin-top:auto;padding:0 20px 34px">
    <div class="card tight" style="border-radius:22px;padding:0 16px">
      <div class="fieldrow"><span>Currency</span><span style="color:var(--text2);display:flex;align-items:center;gap:6px">USD $ ${svg("chev", 15)}</span></div>
    </div>
    <div class="btn accent" style="margin-top:12px">Continue</div>
  </div>
</div>`;

const home = `
<div class="screen">
  <div class="hdr">
    <div class="month">${svg("down", 15)}<span class="now">November 2026</span></div>
    <div class="cbtn">${svg("sliders", 19)}</div>
  </div>
  <div style="padding:8px 20px 0">
    <div class="hero">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="eyebrow">Safe to spend</span>
        <span class="pill">76% used</span>
      </div>
      <div class="hero-amt">$42.80<span class="unit">/ day</span></div>
      <div class="track"><i style="width:76%"></i></div>
      <div class="hero-foot"><span>18 days left</span><span>$770 of $3,200</span></div>
    </div>
    <div class="truth" style="margin-top:10px;padding-left:6px">Excludes 2 bills you haven't logged</div>

    <div class="sec"><span>Budgets</span><span class="link">See all</span></div>
    <div class="hcards">
      ${budgetCard("cart", "mint", "Groceries", "$412 / $600", 69, "#12A150")}
      ${budgetCard("car", "sky", "Transport", "$180 / $200", 90, "#DE9A24")}
      ${budgetCard("fork", "coral", "Eating out", "$268 / $250", 107, "#F0503F")}
    </div>

    <div class="sec"><span>Recent</span><span class="link">See all</span></div>
    <div class="card tight">
      ${txRow("fork", "amber", "Chicken shawarma", "Food &amp; Drink · Today", "−$12.50")}
      ${txRow("cart", "mint", "Weekly shop", "Groceries · Today", "−$86.20")}
      ${txRow("car", "sky", "Ride home", "Transport · Yesterday", "−$18.40")}
    </div>
  </div>
  <div class="fab">${svg("plus", 25, 2.4)}</div>
  ${tabbar("Home")}
</div>`;

// First launch: Home is the entry point and NO input is mounted. No keypad, no keyboard,
// no auto-presented add sheet. This screen exists to pin that behavior (ADR-010).
const emptyHome = `
<div class="screen">
  <div class="hdr">
    <div class="month">${svg("down", 15)}<span class="now">November 2026</span></div>
    <div class="cbtn">${svg("sliders", 19)}</div>
  </div>
  <div style="padding:0 20px;display:flex;flex-direction:column;flex:1">
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
      <div style="width:96px;height:96px;border-radius:34px;background:linear-gradient(150deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 22px 44px rgba(91,91,247,.38)">${svg(
        "wallet",
        40,
        1.6
      )}</div>
      <div style="font-size:25px;font-weight:700;letter-spacing:-.8px;margin-top:26px">Start with one</div>
      <div style="font-size:14.5px;line-height:21px;color:var(--text2);margin-top:8px;max-width:270px">Log your first expense to see where your money goes and what is safe to spend.</div>
      <div class="btn accent" style="width:100%;margin-top:24px">Log your first expense</div>
      <div style="font-size:12px;color:var(--text3);margin-top:12px">No account needed · works offline</div>
    </div>
    <div style="padding-bottom:96px">
      <div class="card tight">
        <div class="grow"><span>Set a monthly budget</span><span class="v">${svg("chev", 16)}</span></div>
        <div class="grow"><span>Add a recurring bill</span><span class="v">${svg("chev", 16)}</span></div>
      </div>
    </div>
  </div>
  ${tabbar("Home")}
</div>`;

const add = `
<div class="screen" style="background:var(--canvas)">
  <div style="display:flex;justify-content:center;padding-top:7px">
    <div style="width:40px;height:5px;border-radius:3px;background:#D6D6D0"></div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px 0">
    <div style="width:38px;height:38px;border-radius:19px;background:var(--surface);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow)">${svg(
      "close",
      17,
      2
    )}</div>
    <div class="seg" style="width:232px">
      <div class="on">Expense</div><div>Income</div><div>Transfer</div>
    </div>
    <div style="width:38px"></div>
  </div>
  <div style="text-align:center;padding:16px 0 4px">
    <div style="font-size:54px;font-weight:700;letter-spacing:-2.2px;line-height:58px;font-variant-numeric:tabular-nums">$12.50<span style="display:inline-block;width:3px;height:38px;background:var(--accent);vertical-align:-6px;margin-left:3px;border-radius:2px"></span></div>
    <div style="font-size:13px;font-weight:600;color:var(--accent);margin-top:6px">Food &amp; Drink</div>
  </div>
  <div style="position:relative;margin-top:14px">
    <div class="chips" style="padding:0 20px">
      <div class="chip on">${svg("fork", 15, 1.9)}Food</div><div class="chip">${svg("car", 15, 1.9)}Transport</div><div class="chip">${svg("cart", 15, 1.9)}Groceries</div><div class="chip">${svg("bolt", 15, 1.9)}Bills</div><div class="chip">More…</div>
    </div>
    <div style="position:absolute;top:0;right:0;bottom:0;width:40px;background:linear-gradient(90deg,transparent,var(--canvas))"></div>
  </div>
  <div style="padding:14px 20px 0">
    <div class="namerow">${svg("pencil", 16)}<span class="val">Chicken shawarma</span><span class="caret"></span></div>
    <div class="chips" style="margin-top:9px;gap:7px">
      <span style="font-size:12px;color:var(--text3);align-self:center;margin-right:2px">Recent</span>
      <div class="chip" style="height:30px;font-size:12.5px;padding:0 12px;box-shadow:none;background:var(--surface)">Weekly shop</div>
      <div class="chip" style="height:30px;font-size:12.5px;padding:0 12px;box-shadow:none;background:var(--surface)">Ride home</div>
      <div class="chip" style="height:30px;font-size:12.5px;padding:0 12px;box-shadow:none;background:var(--surface)">Lunch</div>
    </div>
    <div class="card tight" style="margin-top:14px;border-radius:22px">
      <div class="fieldrow"><span>Checking •• 4821</span><span class="chev">${svg("chev", 16)}</span></div>
      <div class="fieldrow"><span>Today, Nov 12</span><span class="chev">${svg("chev", 16)}</span></div>
      <div class="fieldrow muted"><span>Note, place, tags…</span><span class="chev">${svg("plus", 15)}</span></div>
    </div>
  </div>
  <div class="keys" style="margin-top:auto">
    <div class="key">1</div><div class="key">2</div><div class="key">3</div>
    <div class="key">4</div><div class="key">5</div><div class="key">6</div>
    <div class="key">7</div><div class="key">8</div><div class="key">9</div>
    <div class="key">.</div><div class="key">0</div><div class="key">${svg("del", 22, 1.7)}</div>
  </div>
  <div style="padding:4px 20px 42px">
    <div class="btn accent">Save</div>
  </div>
</div>`;

const transactions = `
<div class="screen">
  <div style="padding:10px 22px 0">
    <div class="eyebrow">November 2026</div>
    <div class="title" style="margin-top:4px">Activity</div>
  </div>
  <div style="padding:14px 20px 0">
    <div class="search">${svg("search", 18)}<span>Search item, place, note</span></div>
    <div class="chips" style="margin-top:12px">
      <div class="chip on">All</div><div class="chip">Type</div><div class="chip">Account</div><div class="chip">Category</div>
    </div>
  </div>
  <div style="padding:0 20px;overflow:hidden">
    <div class="dayhead"><span>Today</span><span class="tot">−$117.10</span></div>
    <div class="card tight">
      ${txRow("fork", "amber", "Chicken shawarma", "Food &amp; Drink · Cash", "−$12.50")}
      ${txRow("cart", "mint", "Weekly shop", "Groceries · Checking", "−$86.20")}
      ${txRow("car", "sky", "Ride home", "Transport · Card", "−$18.40")}
    </div>
    <div class="dayhead"><span>Yesterday</span><span class="tot">−$32.38</span></div>
    <div class="card tight">
      ${txRow("ticket", "coral", "Netflix", "Bills · Card", "−$15.99")}
      ${txRow("bag", "iris", "Oat milk", "Groceries · Card", "−$16.39")}
    </div>
  </div>
  <div class="fab">${svg("plus", 25, 2.4)}</div>
  ${tabbar("Transactions")}
</div>`;

const detail = `
<div class="screen">
  <div class="hdr">
    <div class="cbtn" style="box-shadow:none;background:transparent;justify-content:flex-start;width:auto;gap:6px;padding-left:2px">${svg(
      "back",
      22
    )}<span style="font-size:16px;font-weight:600;letter-spacing:-.3px">Activity</span></div>
    <span class="pill accent" style="height:32px;padding:0 14px;font-size:13px">Edit</span>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;padding:18px 20px 20px">
    ${tile("cart", "mint", 64)}
    <div style="font-size:23px;font-weight:700;letter-spacing:-.7px;margin-top:14px">Weekly shop</div>
    <div style="font-size:13px;color:var(--text2);margin-top:4px">Groceries · Whole Foods · Today, 6:12 PM</div>
    <div style="font-size:42px;font-weight:700;letter-spacing:-1.5px;margin-top:12px;font-variant-numeric:tabular-nums">−$86.20</div>
  </div>
  <div style="padding:0 20px 26px">
    <div class="card tight">
      <div class="grow"><span style="color:var(--text2)">Category</span><span class="v">Groceries</span></div>
      <div class="grow"><span style="color:var(--text2)">Place</span><span class="v">Whole Foods</span></div>
      <div class="grow"><span style="color:var(--text2)">Note</span><span class="v">Bought for the week</span></div>
      <div class="grow"><span style="color:var(--text2)">Account</span><span class="v">Checking •• 4821 ${svg("chev", 15)}</span></div>
      <div class="grow"><span style="color:var(--text2)">Date</span><span class="v">Nov 12, 6:12 PM</span></div>
      <div class="grow"><span style="color:var(--text2)">Tags</span><span class="v">#family</span></div>
      <div class="grow"><span style="color:var(--text2)">Receipt</span><span class="v" style="color:var(--accent)">Add photo ${svg("chev", 15)}</span></div>
    </div>
    <div class="btn accent" style="margin-top:18px">Edit transaction</div>
    <div class="btn danger">Delete transaction</div>
  </div>
</div>`;

const budget = `
<div class="screen">
  <div class="hdr" style="height:58px;align-items:flex-end;padding-bottom:6px">
    <div class="title">Budgets</div>
    <span class="pill soft" style="height:32px;padding:0 12px;font-size:12.5px">Nov 2026</span>
  </div>
  <div style="padding:6px 20px 0">
    <div class="hero" style="padding:18px 20px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <span class="eyebrow">Spent this month</span>
          <div style="font-size:34px;font-weight:700;letter-spacing:-1.3px;margin-top:8px;font-variant-numeric:tabular-nums">$2,430</div>
          <div style="font-size:13px;color:rgba(255,255,255,.55);margin-top:6px">of $3,200 · $770 left</div>
        </div>
        <div style="position:relative;width:78px;height:78px">
          <svg width="78" height="78" viewBox="0 0 78 78"><circle cx="39" cy="39" r="32" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="7"/><circle cx="39" cy="39" r="32" fill="none" stroke="var(--accent2)" stroke-width="7" stroke-linecap="round" stroke-dasharray="201" stroke-dashoffset="48" transform="rotate(-90 39 39)"/></svg>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700">76%</div>
        </div>
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:14px">18 days left in November</div>
    </div>
    <div class="sec"><span>Categories</span><span class="link">Edit</span></div>
    <div class="card tight">
      ${[
        ["cart", "mint", "Groceries", "$412 of $600", 69, "#12A150", "69%"],
        ["car", "sky", "Transport", "$180 of $200", 90, "#DE9A24", "90%"],
        ["fork", "coral", "Eating out", "$268 of $250", 107, "#F0503F", "107%"],
        ["home", "iris", "Home", "$210 of $300", 70, "#5B5BF7", "70%"],
      ]
        .map(
          ([ic, tone, name, sub, pct, fill, label]) => `
        <div class="row" style="padding:10px 0">
          ${tile(ic, tone, 40)}
          <div class="meta">
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
              <span class="t">${name}</span>
              <span style="font-size:12.5px;color:${pct >= 100 ? "var(--danger)" : "var(--text2)"};font-variant-numeric:tabular-nums">${label}</span>
            </div>
            <div class="bar" style="margin-top:7px"><i style="width:${Math.min(pct, 100)}%;background:${fill}"></i></div>
            <div style="font-size:11.5px;color:var(--text3);margin-top:5px;font-variant-numeric:tabular-nums">${sub}</div>
          </div>
        </div>`
        )
        .join("")}
    </div>
    <div class="btn ghost" style="margin-top:6px">Copy last month's budgets</div>
  </div>
  ${tabbar("Budget")}
</div>`;

const insights = `
<div class="screen">
  <div style="padding:10px 22px 0">
    <div class="eyebrow">November 2026</div>
    <div class="title" style="margin-top:4px">Insights</div>
  </div>
  <div style="padding:14px 20px 0">
    <div class="seg" style="width:100%"><div class="on">Month</div><div>3M</div><div>6M</div><div>Year</div></div>

    <div class="card" style="margin-top:14px;padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span class="eyebrow" style="letter-spacing:1.2px">Where it went</span>
        <span style="font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums">$1,286</span>
      </div>
      ${[
        ["Groceries", "$412", 32, 100, "#12A150"],
        ["Home", "$310", 24, 75, "#5B5BF7"],
        ["Transport", "$180", 14, 44, "#2A6FC4"],
        ["Fun", "$96", 7, 22, "#DE9A24"],
      ]
        .map(
          ([n, a, p, w, c]) => `
        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;font-size:13.5px;letter-spacing:-.2px">
            <span style="font-weight:600">${n}</span>
            <span style="color:var(--text2);font-variant-numeric:tabular-nums">${a} <span style="color:var(--text3)">${p}%</span></span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--surface2);margin-top:7px;overflow:hidden">
            <i style="display:block;height:100%;width:${w}%;border-radius:4px;background:${c}"></i>
          </div>
        </div>`
        )
        .join("")}
    </div>

    <div class="card" style="margin-top:12px;padding:18px 18px 14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span class="eyebrow" style="letter-spacing:1.2px">Last 6 months</span>
        <span class="pill soft" style="height:24px;font-size:11px">+8% vs Oct</span>
      </div>
      <svg width="298" height="92" viewBox="0 0 298 92" style="margin-top:12px;overflow:visible">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity=".3"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="M4 68 C 30 62, 46 46, 72 48 S 110 70, 136 58 S 176 26, 202 30 S 246 44, 262 18 L 294 12" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M4 68 C 30 62, 46 46, 72 48 S 110 70, 136 58 S 176 26, 202 30 S 246 44, 262 18 L 294 12 L 294 92 L 4 92 Z" fill="url(#area)"/>
        <circle cx="294" cy="12" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2.5"/>
      </svg>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10.5px;color:var(--text3);letter-spacing:.2px">
        ${["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m) => `<span>${m}</span>`).join("")}
      </div>
    </div>

    <div class="insight" style="margin-top:12px">
      <div style="width:26px;height:26px;border-radius:13px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 26px">${svg(
        "bolt",
        14,
        2
      )}</div>
      <div style="font-size:13.5px;line-height:19px;letter-spacing:-.2px">Groceries is <b>22% above</b> last month <span style="color:var(--text2)">(+$86)</span></div>
    </div>
  </div>
  ${tabbar("Insights")}
</div>`;

const settings = `
<div class="screen">
  <div class="hdr" style="height:56px">
    <div style="display:flex;align-items:center;gap:2px">${svg("back", 22)}<span class="title" style="font-size:30px">Settings</span></div>
  </div>
  <div style="padding:6px 20px">
    <div class="glabel" style="padding-top:10px">Preferences</div>
    <div class="card tight" style="border-radius:22px">
      ${[
        ["globe", "iris", "Country", "United States"],
        ["wallet", "mint", "Currency", "USD $"],
        ["bolt", "amber", "Appearance", "System"],
      ]
        .map(
          ([ic, tone, label, v]) => `
        <div class="grow">
          ${tile(ic, tone, 30)}
          <span>${label}</span>
          <span class="v">${v} ${svg("chev", 15)}</span>
        </div>`
        )
        .join("")}
    </div>
    <div class="glabel">Library</div>
    <div class="card tight" style="border-radius:22px">
      ${[
        ["fork", "amber", "Categories", "12"],
        ["layers", "sky", "Accounts", "2"],
        ["ticket", "coral", "Recurring", "3"],
      ]
        .map(
          ([ic, tone, label, v]) => `
        <div class="grow">
          ${tile(ic, tone, 30)}
          <span>${label}</span>
          <span class="v">${v} ${svg("chev", 15)}</span>
        </div>`
        )
        .join("")}
    </div>
    <div class="glabel">Data</div>
    <div class="card tight" style="border-radius:22px">
      <div class="grow"><span>Export CSV</span><span class="v">Share</span></div>
      <div class="grow"><span>Backup (JSON)</span><span class="v">Save file</span></div>
      <div class="grow"><span>App lock</span><span class="v">Off ${svg("chev", 15)}</span></div>
    </div>
    <div class="btn danger" style="margin-top:14px">Delete all data</div>
    <div style="text-align:center;font-size:11.5px;color:var(--text3);margin-top:4px">Version 1.0.0</div>
  </div>
</div>`;

/* -------------------------------------------------------------------- build */

const SCREENS = {
  onboarding,
  "onboarding-currency": onboardingCurrency,
  home,
  "home-empty": emptyHome,
  add,
  transactions,
  detail,
  budget,
  insights,
  settings,
};

const fontFace = (prefix) => `@font-face{font-family:"Geist";src:url("${prefix}assets/fonts/Geist-Variable.ttf") format("truetype");font-weight:100 900;font-style:normal;font-display:block}`;

const page = (name, body, theme) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Expense Tracker — ${name}${theme === "dark" ? " (dark)" : ""}</title>
<style>${fontFace("../../../../")}${CSS}</style>
</head>
<body>
<div class="phone"${theme === "dark" || name === "onboarding" ? ' data-theme="dark"' : ""}>
${statusBar(theme === "dark" || name === "onboarding")}
${body}
<div class="homebar${theme === "dark" || name === "onboarding" ? " light" : ""}"></div>
</div>
</body>
</html>`;

mkdirSync(SCREENS_DIR, { recursive: true });
mkdirSync(join(HERE, "mockups", "png"), { recursive: true });

const names = Object.keys(SCREENS);
const darkNames = names.filter((n) => n !== "onboarding");

for (const name of names) {
  writeFileSync(join(SCREENS_DIR, `${name}.html`), page(name, SCREENS[name], "light"), "utf8");
}
for (const name of darkNames) {
  writeFileSync(join(SCREENS_DIR, `dark-${name}.html`), page(name, SCREENS[name], "dark"), "utf8");
}

const gallery = (items, dark) => `
<div class="grid">
${items
  .map((n) => {
    const file = dark ? `dark-${n}` : n;
    return `<figure><a href="./screens/${file}.html"><img src="./png/${file}.png" alt="${file}"/><figcaption>${n}</figcaption></a></figure>`;
  })
  .join("\n")}
</div>`;

const sheet = (dark) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><title>Expense Tracker — mockups${dark ? " (dark)" : ""}</title>
<style>
${  fontFace("../../../")
}
body{background:${dark ? "#08090B" : "#0B0C10"};color:#F2F4F7;font-family:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;padding:40px}
h1{font-size:22px;letter-spacing:-.4px;margin:0 0 6px}
p{color:#9AA3B2;font-size:14px;margin:0 0 24px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
figure{margin:0}
img{width:100%;border-radius:22px;display:block;background:#E8E7E2}
figcaption{font-size:13px;color:#C9D1DB;margin-top:10px}
a{color:inherit;text-decoration:none}
.alt{display:inline-block;margin-bottom:22px;padding:9px 16px;border-radius:999px;background:#F5F5F3;color:#0B0C10;font-size:13px;font-weight:600;text-decoration:none}
</style></head><body>
<h1>Expense Tracker — page mockups${dark ? " · dark" : ""}</h1>
<p>390 × 844 · 2× renders. Generated by <code>build.mjs</code>; tokens match 04-design-system.md. Launch is Overview only — no keypad appears until you tap +.</p>
<a class="alt" href="./${dark ? "index" : "index-dark"}.html">${dark ? "← Light mode" : "Dark mode →"}</a>
${gallery(dark ? darkNames : names, dark)}
</body></html>`;

writeFileSync(INDEX, sheet(false), "utf8");
writeFileSync(join(HERE, "mockups", "index-dark.html"), sheet(true), "utf8");
console.log(`wrote ${names.length} light + ${darkNames.length} dark screens + 2 indexes`);
