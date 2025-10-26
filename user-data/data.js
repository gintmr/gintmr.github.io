export const bio = [
  "Hi, I'm Xinrui Wu (吴欣锐)!", 
  "I am currently pursuing my undergraduate degree in Embedded Systems at the School of Information and Software Engineering (SISE), University of Electronic Science and Technology of China (UESTC), with a GPA of 3.54/4.0.",

  "I have gained internship experience at Megvii Tech, HKUST, and Tsinghua AIR, along with substantial research exposure. My research interests primarily focus on embodied intelligence, multimodal systems, robotic perception, and model lightweighting.",

  "During my internships at the UESTC's Future Media Center and Megvii Technology, I focused on open-vocabulary detection and segmentation. This work not only enhanced model accuracy on known categories but also aimed to break the conceptual boundaries of traditional models, enabling them to understand and localize objects described in any language. By leading and contributing to the development of a large-scale open-vocabulary detection framework and constructing a massive training data engine, I gained a comprehensive understanding of visual perception—spanning from algorithmic design to data curation.",

  "As a visiting student at HKUST, driven by the pursuit of practical solutions for resource-constrained environments, I proposed a novel distillation method to efficiently transfer knowledge from complex models to lightweight networks. This approach provided deployable solutions for tasks such as salient marine organism recognition in challenging oceanic settings.",

  "Interning at Tsinghua’s AIR (Institute for AI Industry Research), I delved into the mechanisms of human reasoning, identifying limitations in current AI inference paradigms. My goal was to make large models’ reasoning processes more controllable and efficient, while also exploring how to replicate human-like thinking in embodied robotic “brains.” This would enable a more human-like workflow from perception to decision-making.",

  "These experiences form a complete technical chain spanning from “perception” to “reasoning,” laying a solid foundation for my in-depth research in embodied intelligence, multimodal systems, and robotic perception.",

  "Feel free to reach out to me at <a href='mailto:xinruiwu.wxr@gmail.com'>xinruiwu.wxr@gmail.com</a> for tech discussions, job opportunities, or just to say hello—I'd love to hear from you!"
  
];


export const education = [
  {
    title: "B.Eng. in Software Engineering",
    duration: "Sep 2023 - present",
    subtitle: "University of Electronic Science and Technology of China , UESTC",
    details: [
      "GPA: 3.54/4.0",
      "Relevant Courses: Software Engineering, Compiler Principles, Computer Organization and Architecture, Computer Networks, Embedded Operating Systems",
    ],
    tags: ["Computer Science", "Engineering"], // 添加标签数组,要素必须齐全
    icon: "book",
  }
];

export const awards = [
  {
    title: "UESTC Model Student Scholarship",
    duration: "Oct 2025",
    subtitle: "Scientific and technological innovation",
    tags: ["Scholarship"],
    icon: "star-o",
  },
  {
    title: "UESTC Model Student Scholarship",
    duration: "Oct 2024",
    subtitle: "Scientific and technological innovation",
    tags: ["Scholarship"],
    icon: "star-o",
  },
  {
    title: "National Second Prize",
    duration: "Aug 2025",
    subtitle: "C4 National College Student Network Technology Challenge",
    tags: ["Competition"],
    "icon": "trophy"
  },
  {
    "title": "National Third Prize",
    "duration": "May 2025",
    "subtitle": "National College Student Innovation and Entrepreneurship Competition",
    "tags": ["Competition", ],
    "icon": "trophy"
  },
  {
    title: "National Third Prize",
    duration: "Jun 2025",
    subtitle: "China College Student Computer Design Competition",
    tags: ["Competition"],
    "icon": "trophy"
  },
  {
    title: "National Third Prize",
    duration: "Aug 2024",
    subtitle: "C4 National College Student Network Technology Challenge",
    tags: ["Competition"],
    "icon": "trophy"
  },
  {
    title: "Second Prize of SiChuan Province",
    duration: "Jun 2024",
    subtitle: "China College Student Computer Design Competition",
    tags: ["Competition"],
    "icon": "trophy"
  },
]

export const experience = [

    {
      "title": "Research Intern",
      "duration": "Jun 2024 - Present",
      "subtitle": "Center for Future Media (CFM) - UESTC",
      "details": [
        "Research focus: advancing Open-Vocabulary Object Detection (OVD) and Segmentation (OVS)",
        "Pioneered innovative methods to enhance object detection capabilities",
        "Collaborated on developing a robust segmentation framework",
        "Achieved significant progress in recognizing diverse objects"
      ],
      "tags": ["Computer Vision", "Open-Vocabulary", "Segmentation", "Object Detection"],
      "icon": "search"
    },
    {
      "title": "CV Algorithm Intern", 
      "duration": "Feb 2025 - Jul 2025",
      "subtitle": "Megvii Technology Limited (MEGVII)",
      "details": [
        "Conducted cutting-edge research on Open-Vocabulary Detection (OVD) and Vision-Language Models (VLM)",
        "Assisted in designing MEGVII's proprietary OVD model framework architecture",
        "Led development of large-scale OVD training data engine handling 100M+ samples",
        "Supported large-scale OVD model training experiments and performance optimization"
      ],
      "tags": ["Computer Vision", "Open-Vocabulary", "VLM", "Large-scale Training"],
      "icon": "search"
    },
    {
      "title": "Research Intern",
      "duration": "Jul 2025 - Sep 2025", 
      "subtitle": "VGD Group - HKUST",
      "details": [
        "Focuses on lightweight image segmentation and salient individual identification for marine environments",
        "Proposes a novel distillation method to efficiently transfer knowledge from instance segmentation models",
        "Provides feasible solution for deploying advanced segmentation models in resource-constrained scenarios",
        "Contributed to dataset development for salient individual identification task"
      ],
      "tags": ["Lightweight Models", "Knowledge Distillation", "Marine Vision", "Resource-Constrained"],
      "icon": "search"
    },
    {
      "title": "Research Intern",
      "duration": "Jan 2025 - Present",
      "subtitle": "Institute for AI Industry Research (AIR) - Tsinghua University",
      "details": [
        "Research focus: generation of controllable length Chain-of-Thought (CoT) for large language models",
        "Developed novel approaches to control and optimize the length of reasoning chains in LLM outputs",
        "Conducted in-depth research on chain-of-thought compression techniques for MLLM",
        "Facilitating MLLM enhanced application in embodied intelligence"
      ],
      "tags": ["LLM", "Chain-of-Thought", "MLLM", "Embodied Intelligence", "Reasoning"],
      "icon": "search"
    },
  
];

export const papers = [
    {
      "title": "BudgetThinker: Empowering Budget-aware LLM Reasoning with Control Tokens",
      "authors": "Hao Wen*, Xinrui Wu*, ..., Yunxin Liu, Ya-Qin Zhang, Yuanchun Li",
      "conference": "Target submission to ICLR 2026",
      "status": "preparing",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["LLM", "Reasoning", "Budget-Aware", "Control Tokens"],
      "icon": "search"
    },
    {
      "title": "MaskGuide: Efficient Distillation for Deployable Lightweight Segmentation in Marine Environments",
      "authors": "Xinrui Wu*, Ziqiang Zheng*, Yiwei Chen, Zeyu Ma*, Yang Yang, Sai-Kit Yeung", 
      "conference": "Target submission to RA-L",
      "status": "preparing",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["Knowledge Distillation", "Lightweight Segmentation", "Marine Environments"],
      "icon": "search"
    },
    {
      "title": "ParaThinker: Native Parallel Thinking as a New Paradigm to Scale LLM Test-time Compute",
      "authors": "Hao Wen*, Yifan Su*, Feifei Zhang, Xinrui Wu, ..., Yuanchun Li",
      "conference": "Target submission to ICLR 2026", 
      "status": "preparing",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["LLM", "Parallel Thinking", "Test-time Compute", "Reasoning"],
      "icon": "search"
    },
    {
      "title": "IMC-1000: Dataset and Benchmark for Identifying Salient Individual Marine Creatures",
      "authors": "Yiwei Chen, Ziqiang Zheng, Xinrui Wu, Sai-Kit Yeung",
      "conference": "Target submission to CVPR 2026",
      "status": "preparing",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["Computer Vision", "Marine Biology", "Dataset", "Object Detection"],
      "icon": "search"
    },
  // 更多论文...
];

export const hobbies = [
  "Long-distance cycling 🚴, Table tennis 🏓, Swimming 🏊, Fitness 💪, Running 🏃",
  "Finance 💹",
  " Watching anime & movies 🎬, Music(R&B, Soul, Hip-Hop)🎵🎤🎧"

  
  // "Python, sh, cpp, Java, Linux, LaTex, Git, CUDA...",
  // "Embodied Intelligence, Multimodal and Robotic perception, MLLM, LLM, Computer Vision, Knowledge Distillation...",
  // "PyTorch, TensorFlow, OpenCV, YOLO, MMDetection, Detectron2, IoT Development...",
];

// export const trekking = [
//   "<strong>Kheerganga Trek</strong>, Himachal Pradesh (9,711 feet)",
//   "<strong>Triund Trek</strong>, Himachal Pradesh (9,350 feet)",
//   "<strong>Kedarkantha Trek</strong>, Uttarakhand (12,500 feet)",
//   "<strong>Jalori Pass Trek</strong>, Himachal Pradesh (10,800 feet)",
//   "<strong>Vaishno Devi Trek</strong>, Jammu & Kashmir (5,200 feet)",
// ];



export const footer = [
    // {
    //   label: "Dev Profiles",
    //   data: [
    //     {
    //       text: "Stackoverflow",
    //       link: "https://stackoverflow.com/users/8461233/vinay-somawat",
    //     },
    //     {
    //       text: "GitHub",
    //       link: "https://github.com/vinaysomawat",
    //     },
    //     {
    //       text: "LeetCode",
    //       link: "https://leetcode.com/somawatvinay/",
    //     },
    //   ],
    // },
    // {
    //   label: "Resources",
    //   data: [
    //     {
    //       text: "Enable Dark/Light Mode",
    //       func: "enableDarkMode()",
    //     },
    //     {
    //       text: "Print this page",
    //       func: "window.print()",
    //     },
    //     {
    //       text: "Clone this page",
    //       link: "https://github.com/vinaysomawat/vinaysomawat.github.io",
    //     },
    //   ],
    // },
  {
    label: "Links",
    data: [
        // {
        //   text: "Linkedin",
        //   link: "https://www.linkedin.com/in/vinaysomawat/",
        // },
        // {
        //   text: "Twitter",
        //   link: "https://twitter.com/thesigmakid",
        // },
      // {
      //   text: "BiliBili😇",
      //   link: "https://space.bilibili.com/475570627?spm_id_from=333.337.0.0",
      // },
      {
        text: "Academic🧑‍🏫",
        link: "https://gintmr.github.io/",
      },     
      {
        text: "Google Scholar📝",
        link: "https://scholar.google.com/citations?user=pJzltu8AAAAJ&hl=en",
      },      
      {
        text: "Github 🫠",
        link: "https://github.com/gintmr",
      },
    ],
  },
  // {
  //   label: "copyright-text",
  //   data: ["Made with &hearts; by Vinay Somawat"],
  // },
];
