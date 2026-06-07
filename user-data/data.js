export const bio = [
    "Hi, I'm Xinrui Wu (吴欣锐)!",

    "Here is My <a href='https://drive.google.com/file/d/1yHJ3HdnyRxWbuLOH_42hYNoMHS7pIf7v/view?usp=sharing'>CV</a> | <a href='https://scholar.google.com/citations?user=pJzltu8AAAAJ&hl=en'>Google Scholar</a> | <a href='https://github.com/gintmr'>GitHub</a> | <a href='https://gintmr.github.io/'>Homepage</a>.",


    "I am currently pursuing my B.S. in Software Engineering (Embedded System) at the University of Electronic Science and Technology of China (UESTC), with a GPA of 3.63/4.0.",
    
    "My research experience spans <strong>UESTC Center for Future Media</strong>, <strong>Megvii Technology</strong>, <strong>HKUST VGD Group</strong>, <strong>Tsinghua AIR</strong>, and <strong>MBZUAI</strong>. I have worked with Prof. Yang Yang, Dr. Wei Ge, Prof. Sai-Kit Yeung, Prof. Yuanchun Li, Prof. Yunxin Liu, and Prof. Yutong Xie.",
    
    "My current interests include <strong>clinical AI</strong>, <strong>clinical world models</strong>, <strong>LLM reasoning</strong>, and <strong>vision systems</strong>. More specifically, I work on clinical reasoning optimization, longitudinal clinical prognosis, causal trajectory modeling, controllable chain-of-thought generation, test-time compute scaling, open-vocabulary detection and segmentation, lightweight deployment, and knowledge distillation.",
  
    "In vision, I have studied open-vocabulary detection and segmentation, built large-scale automated data pipelines, and developed deployable lightweight segmentation methods such as MaskGuide. In reasoning, I have worked on BudgetThinker for budget-aware LLM reasoning and on clinical reasoning frameworks that integrate complex multi-stage clinical information.",
  
    "Feel free to reach out at <a href='mailto:xinruiwu.wxr@gmail.com'>xinruiwu.wxr@gmail.com</a> for collaborations or conversations!"


];


export const education = [
  {
    title: "B.S. in Software Engineering (Embedded System)",
    duration: "Sep 2023 - present",
    subtitle: "University of Electronic Science and Technology of China (UESTC), Sichuan, China",
    details: [
      "GPA: 3.63/4.0",
      "Relevant Courses: Software Engineering, Compiler Principles, Computer Organization and Architecture, Computer Networks, Embedded Operating Systems, RTOS, ARM, Quadcopter Drones"
    ],
    tags: ["Computer Science", "Engineering"], // 添加标签数组,要素必须齐全
    icon: "book",
  }
];

export const awards = [
  {
    title: "UESTC Model Student Scholarship",
    duration: "Oct 2025",
    subtitle: "Top 5%, Sci-Tech Innovation",
    tags: ["Scholarship"],
    icon: "star-o",
  },
  {
    title: "UESTC Model Student Scholarship",
    duration: "Oct 2024",
    subtitle: "Top 5%, Sci-Tech Innovation",
    tags: ["Scholarship"],
    icon: "star-o",
  },
  {
    title: "National Second Prize",
    duration: "Aug 2024",
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
      "subtitle": "UESTC, Center for Future Media (CFM), Advisor: <a href='https://cfm.uestc.edu.cn/~yangyang/'>Prof. Yang Yang</a>",
      "details": [
        "Research focus: advancing Open-Vocabulary Object Detection (OVD) and Segmentation (OVS)",
        "Pioneered methods to enhance object detection capabilities and reduce false positives in OVD",
        "Collaborated on developing a robust segmentation framework, improving accuracy across various datasets",
        "Achieved significant progress in recognizing and segmenting objects with diverse appearances in images"
      ],
      "tags": ["Computer Vision", "Open-Vocabulary", "Segmentation", "Object Detection"],
      "icon": "search"
    },
    {
      "title": "CV Algorithm Intern", 
      "duration": "Feb 2025 - Jul 2025",
      "subtitle": "Megvii Technology Limited (MEGVII), Mentor: Dr. Wei Ge",
      "details": [
        "Proposed a unified prompt representation method, transforming multi-modal inputs into visual masks to simplify alignment and improve training efficiency",
        "Built a large-scale automated data pipeline capable of processing billions of samples to support model training",
        "Led development of an open-vocabulary detection model achieving performance comparable to closed-source SOTA models",
        "Successfully deployed the developed OVD model in business applications, validating its practical utility"
      ],
      "tags": ["Computer Vision", "Open-Vocabulary", "VLM", "Large-scale Training"],
      "icon": "search"
    },
    {
      "title": "Research Intern",
      "duration": "Jul 2025 - Aug 2025", 
      "subtitle": "HKUST, VGD Group, Advisor: <a href='https://scholar.google.com/citations?user=16iMMwwAAAAJ&hl=zh-CN'>Prof. Sai-Kit Yeung</a>",
      "details": [
        "Research focus: lightweight image segmentation and salient individual identification for marine environments",
        "Proposed the MaskGuide mask-guided distillation framework, enhancing critical information and suppressing noise through feature separation and purification",
        "The resulting Tiny-MSAM model achieves 99.4% of the Segment Anything Model's accuracy with only 0.5% of its parameters and an inference speed of 164.7 FPS",
        "Submitted as a first-author paper to IEEE Robotics and Automation Letters"
      ],
      "tags": ["Lightweight Models", "Knowledge Distillation", "Marine Vision", "Resource-Constrained"],
      "icon": "search"
    },
    {
      "title": "Research Intern",
      "duration": "Jan 2025 - Present",
      "subtitle": "Tsinghua AIR, Advisors: <a href='https://yuanchun-li.github.io/'>Prof. Yuanchun Li</a>, <a href='https://scholar.google.com/citations?user=TFGBA9cAAAAJ&hl=zh-CN'>Prof. Yunxin Liu</a>",
      "details": [
        "Research focus: generation of controllable length Chain-of-Thought (CoT) for large language models",
        "Proposed the BudgetThinker framework, centered on an innovative proportional control token mechanism",
        "Via a two-stage training pipeline integrating specialized data and reinforcement learning, the model achieved SOTA on benchmarks like MATH with over 95% budget adherence success",
        "Demonstrated generalization in embodied spatial reasoning and submitted as a co-first-author paper to ACL"
      ],
      "tags": ["LLM", "Chain-of-Thought", "MLLM", "Embodied Intelligence", "Reasoning"],
      "icon": "search"
    },
    {
      "title": "Visiting Student",
      "duration": "Jan 2026 - Present",
      "subtitle": "MBZUAI, Advisor: <a href='https://scholar.google.com/citations?user=ddDL9HMAAAAJ&hl'>Prof. Yutong Xie</a>",
      "details": [
        "Research focus: optimization of clinical reasoning",
        "Proposed a framework that integrates complex multi-stage clinical information to enhance structured medical reasoning",
        "Explored frontier training paradigms for clinical world models"
      ],
      "tags": ["Clinical AI", "Medical Reasoning", "World Models", "Causal Modeling"],
      "icon": "search"
    },
  
];

export const papers = [
    {
      "title": "MaskGuide: Efficient Distillation for Deployable Lightweight Segmentation in Marine Environments",
      "authors": "First Author",
      "roleGroup": "first",
      "conference": "Accepted by IEEE Robotics and Automation Letters, Apr 2026",
      "link": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=pJzltu8AAAAJ&citation_for_view=pJzltu8AAAAJ:d1gkVwhDpl0C",
      "status": "accepted",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["Knowledge Distillation", "Lightweight Segmentation", "Marine Environments"],
      "icon": "search"
    },
    {
      "title": "HiCausal: Hierarchical Causal Trajectory Modeling for Longitudinal Clinical Prognosis",
      "authors": "First Author",
      "roleGroup": "first",
      "conference": "Submitted to NeurIPS 2026, May 2026",
      "status": "submitted",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["Clinical AI", "Causal Modeling", "Longitudinal Prognosis"],
      "icon": "search"
    },
    {
      "title": "BudgetThinker: Empowering Budget-aware LLM Reasoning with Control Tokens",
      "authors": "Co-first Author",
      "roleGroup": "first",
      "conference": "Submitted to ACL, May 2026",
      "link": "https://arxiv.org/pdf/2508.17196?",
      "status": "submitted",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["LLM", "Reasoning", "Budget-Aware", "Control Tokens"],
      "icon": "search"
    },
    {
      "title": "ParaThinker: Native Parallel Thinking as a New Paradigm to Scale LLM Test-time Compute",
      "authors": "Contributor",
      "roleGroup": "contributor",
      "conference": "Submitted to ACL, May 2026", 
      "status": "submitted",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["LLM", "Parallel Thinking", "Test-time Compute", "Reasoning"],
      "icon": "search"
    },
    {
      "title": "Seatree: Tracing Marine Creatures through Taxonomic Tree",
      "authors": "Contributor",
      "roleGroup": "contributor",
      "conference": "Submitted to ECCV 2026, Mar 2026",
      "status": "submitted",
      "abstract": [
        // "First large-scale marine creature identification benchmark with 1,000+ species",
      ],
      "tags": ["Computer Vision", "Marine Biology", "Taxonomic Tree"],
      "icon": "search"
    },
  // More papers...
];

export const hobbies = [
  "<strong>Clinical AI:</strong> Clinical reasoning optimization, longitudinal clinical prognosis, causal trajectory modeling",
  "<strong>World Models:</strong> Clinical world models, multimodal reasoning, frontier training paradigms",
  "<strong>LLM Reasoning:</strong> Efficient reasoning, controllable generation, test-time compute scaling",
  "<strong>Vision Systems:</strong> Open-vocabulary detection and segmentation, lightweight deployment, knowledge distillation"

  
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
