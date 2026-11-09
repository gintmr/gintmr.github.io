// Author shown on the X post cards.
export const xAccount = {
  name: "Xinr",
  handle: "xinrui_wu34550",
  avatar: "/assets/projects/nodlink/x-avatar.webp",
};

export const projects = [
  {
    id: "nodlink",
    logo: "/assets/projects/logos/nodlink.png",
    name: "NodLink",
    description: "Turns AirPods into a hands-free mouse on macOS. Turn your head to move the cursor, tilt to click or drag, and speak commands in English or Chinese, using the AirPods' built-in motion sensors with no camera or extra hardware. The online demo simulates head movement with the mouse.",
    previewUrl: "https://gintmr.github.io/NodLink/",
    repositoryUrl: "https://github.com/gintmr/NodLink",
    previewLabel: "Interactive demo",
    // Rendered as static preview cards; text and images are copied from the posts,
    // so the page loads no X scripts.
    posts: [
      {
        url: "https://x.com/xinrui_wu34550/status/2119189896091103448",
        date: "2026-11-07",
        lang: "en",
        text: "I turned my AirPods into a mouse. Turn your head to point, tilt to click, say \"click\" to click. Free and open source for Mac 🎧🖱️",
        attachment: { kind: "article", label: "X Article" },
      },
      {
        url: "https://x.com/xinrui_wu34550/status/2119121702731108562",
        date: "2026-11-07",
        lang: "en",
        text: "Your AirPods are secretly a mouse.🤯\nNobody told you. 🎧🖱️\nTurn your head to point.\nTilt to click.\nSpeak to command.\nScrolling TikTok, replying to messages and ordering food without touching anything.\nNo camera/extra hardware/hands.\nBuilt for anyone who can't use their hands.",
        attachment: { kind: "video", image: "/assets/projects/nodlink/x-video-poster.webp", label: "5:15" },
      },
    ],
  },
  {
    id: "dji-luma",
    logo: "/assets/projects/logos/luma.svg",
    name: "Luma for DJI Action",
    description: "An Android companion app that adds scheduled recording to DJI Action cameras. Set the capture interval and clip duration from your phone, then let the camera automatically record everyday moments. The current test build targets DJI Osmo Action 4 on Android 13+ and supports Chinese and English with light and dark themes.",
    previewUrl: "https://gintmr.github.io/DJI-Luma/",
    repositoryUrl: "https://github.com/gintmr/DJI-Luma",
    previewLabel: "Project website",
  },
  {
    id: "papertone",
    logo: "/assets/projects/logos/papertone.svg",
    name: "Papertone",
    description: "A listening library that turns alphaXiv paper podcasts into study material. Every paper becomes a card with a waveform player, a sentence-level timeline, bilingual and dictation transcripts, and an offline copy of the library for focused listening practice.",
    previewUrl: "https://gintmr.github.io/Papertone/",
    repositoryUrl: "https://github.com/gintmr/Papertone",
    previewLabel: "Interactive preview",
  },
  {
    id: "researchos",
    logo: "/assets/projects/logos/researchos.svg",
    name: "Research OS",
    description: "A local-first workspace that connects research questions, literature, experiments, and evidence. Insights link directly to supporting experiment tables, preserving project context for the next experiment, paper draft, or AI-assisted session.",
    previewUrl: "https://gintmr.github.io/ResearchOS-Public/",
    repositoryUrl: "https://github.com/gintmr/ResearchOS-Public",
    previewLabel: "Read-only demo",
  },
  {
    id: "fingraph",
    logo: "/assets/projects/logos/fingraph.svg",
    name: "FinGraph",
    description: "A macro-financial dashboard that connects source-linked market evidence through a nine-layer framework. Exportable AI Skill Packs carry the evidence, reasoning structure, and citations into any language model for guided analysis.",
    previewUrl: "https://fin-graph-two.vercel.app/",
    repositoryUrl: "https://github.com/gintmr/FinGraph",
    previewLabel: "Interactive preview",
  },
  {
    id: "embedded-studio",
    logo: "/assets/projects/logos/embedded-studio.png",
    name: "UESTC SISE Embedded Studio",
    description: "The official website and knowledge hub for Embedded Studio at UESTC’s School of Information and Software Engineering. It brings together learning resources, past recruitment challenges, and practical guides across robotics, IoT, edge AI, and computer systems.",
    previewUrl: "https://uestc404.github.io/Embedded-Studio/",
    repositoryUrl: "https://github.com/UESTC404/Embedded-Studio",
    previewLabel: "Official website",
  },
];
