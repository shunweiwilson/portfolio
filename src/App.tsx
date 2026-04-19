import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowLeft, ArrowRight } from 'lucide-react';

// --- Shared Reusable Components ---

// Scroll Reveal Component using IntersectionObserver
interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const FadeUp: React.FC<FadeUpProps> = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    if (domRef.current) observer.observe(domRef.current);
    return () => {
      if (domRef.current) observer.unobserve(domRef.current);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transform transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- Page Sections ---

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-sm px-6 py-5 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between">
          <a href="/" className="text-xl tracking-tight z-50 relative font-normal flex items-center gap-2">
            <span className="w-5 h-5 bg-yellow-400 rounded-full inline-block"></span>
            Wilson Shunwei Wu
          </a>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 items-center text-xl tracking-tight font-normal">
            <a href="#portfolio" className="link-underline transition-opacity">Featured</a>
            <a href="#more" className="link-underline transition-opacity">Beyond</a>
            <a href="#about" className="link-underline transition-opacity">About</a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden z-50 relative focus:outline-none hover:opacity-60 transition-opacity"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X size={28} strokeWidth={1.5} /> : <Menu size={28} strokeWidth={1.5} />}
          </button>
        </div>
      </nav>

      {/* Fullscreen Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-white z-40 px-6 pt-32 pb-12 flex flex-col gap-8 transition-opacity duration-300 md:hidden ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <a href="#portfolio" onClick={() => setIsMenuOpen(false)} className="text-[clamp(2.5rem,5vw,4.5rem)] tracking-[-0.03em] link-underline transition-opacity w-fit">Featured</a>
        <a href="#more" onClick={() => setIsMenuOpen(false)} className="text-[clamp(2.5rem,5vw,4.5rem)] tracking-[-0.03em] link-underline transition-opacity w-fit">Beyond</a>
        <a href="#about" onClick={() => setIsMenuOpen(false)} className="text-[clamp(2.5rem,5vw,4.5rem)] tracking-[-0.03em] link-underline transition-opacity font-medium w-fit">About</a>
      </div>
    </>
  );
}

function LoadingDots() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <span className="inline-block w-[1.5em] text-left">{dots}</span>;
}

function Hero() {
  return (
    <section id="home" className="pt-[68px] pb-24 px-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Constrained Video/Image Block */}
        <FadeUp>
          <div className="w-full h-[55vh] md:h-[65vh] lg:h-[80vh]">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              poster="https://github.com/shunweiwilson/image-storage/blob/main/Wilson_Discuss_Hero.png?raw=true"
              className="w-full h-full object-cover rounded-sm"
            >
              {/* Add your video URL below in the src attribute */}
              <source src="https://video.wixstatic.com/video/807af0_43303b0c5dca454bb00cc7e28d919d48/1080p/mp4/file.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </FadeUp>
        
        {/* Text Block */}
        <div className="mt-8 md:mt-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-12">
              <h3 className="text-[clamp(1.8rem,4vw,3rem)] font-normal tracking-[-0.03em] leading-[1.2em] max-w-4xl">
                Instead of being a skyscraper, I always consider myself a bridge, which connects, communicates, and conduces.
              </h3>
            </div>
            <div className="md:col-span-12">
              <p className="text-lg md:text-xl text-[#333333] leading-[1.3em]">
                Wilson Wu, Multi-discipline Product Designer.<br/>
                Crafting meaningful hardware and software experiences, currently @YouTube, Google<LoadingDots />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const projectsData = [
  {
    id: 1,
    title: "YouTube Living Room",
    desc: "Design innovation for the largest screen at home. To make YouTube the world’s best TV experience.",
    chips: ["User Experience Design", "Media", "Community", "Platform", "TV"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/YTLR_Hero_2.gif?raw=true"
  },
  {
    id: 2,
    title: "Verily Retinal Camera",
    desc: "Prevent blindness by re-imagine retinal screening services",
    chips: ["Hardware+Software UX", "Founding Designer", "FDA Listed", "AI", "Healthcare"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/VRC_hero.png?raw=true"
  },
  {
    id: 3,
    title: "Quo STDs AI",
    desc: "How can we levrage AI agent to make healthcare better for humans?",
    chips: ["UX Design", "Founding Designer", "AI", "Healthcare"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Quo_hero_1.jpg?raw=true"
  },
  {
    id: 4,
    title: "Eldernext Muscle Training Wearables",
    desc: "Prevent the elders from the vicious circle of Sarcopenia.",
    chips: ["Hardware+Software UX", "Wearables", "Fitness"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Eldernext_Hero_3.jpg?raw=true"
  }
];

function Projects() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = window.innerWidth < 768 ? window.innerWidth * 0.85 : window.innerWidth * 0.45;
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <section id="portfolio" className="py-24 px-6 border-t border-[#111111] scroll-mt-[68px]">
      <div className="max-w-[1600px] mx-auto">
        <FadeUp>
          <div className="flex flex-row items-center gap-1 md:gap-2 mb-12">
            <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-normal tracking-[-0.03em] leading-[1.2em]">
              Featured projects
            </h2>
            
            {/* Navigation Arrows */}
            <div className="flex shrink-0 text-[clamp(2.5rem,5vw,4.5rem)] pt-[0.1em]">
              <button 
                onClick={() => handleScroll('left')}
                className="flex items-center justify-center hover:opacity-40 cursor-pointer transition-opacity focus:outline-none shrink-0" 
                aria-label="Previous"
              >
                <ArrowLeft strokeWidth={1.5} size="1em" />
              </button>
              <button 
                onClick={() => handleScroll('right')}
                className="flex items-center justify-center hover:opacity-40 cursor-pointer transition-opacity focus:outline-none shrink-0" 
                aria-label="Next"
              >
                <ArrowRight strokeWidth={1.5} size="1em" />
              </button>
            </div>
          </div>
        </FadeUp>
        
        <FadeUp delay={100} className="relative">
          {/* Carousel Track */}
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 items-start hide-scrollbar" 
          >
            {projectsData.map((project) => (
              <div 
                key={project.id} 
                className="group w-[85vw] md:w-[60vw] lg:w-[60vw] snap-start flex-shrink-0 flex flex-col"
              >
                <a href="#contact" className="block overflow-hidden w-full h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px] mb-6 rounded-sm">
                  <img 
                    src={project.img} 
                    alt={project.title} 
                    className="w-full h-full object-cover transform group-hover:scale-[1.03] transition-transform duration-700 ease-out" 
                  />
                </a>
                <div className="w-full md:w-3/4">
                  <h3 className="text-[clamp(1.8rem,4vw,3rem)] font-normal tracking-[-0.03em] leading-[1.2em]">
                    <a href="#contact" className="inline bg-gradient-to-r from-yellow-300 to-yellow-300 bg-no-repeat bg-[position:0_95%] bg-[length:0%_30%] group-hover:bg-[length:100%_30%] transition-[background-size] duration-500 ease-out">
                      {project.title}
                    </a>
                  </h3>
                  {project.desc && (
                    <p className="text-lg md:text-xl text-[#111111] leading-[1.3em] mt-4 mb-2">
                      {project.desc}
                    </p>
                  )}
                  {project.chips && project.chips.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {project.chips.map((chip, i) => (
                        <span key={i} className="px-3 py-[0.15rem] text-[0.75rem] md:text-sm font-medium border border-[#bbbbbb] text-[#666666] tracking-wide rounded-full group-hover:border-[#111111] group-hover:text-[#111111] transition-colors duration-500">
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

const explores = [
  {
    title: "AI-powered personalized baby sleep-coaching devices solution",
    desc: (
      <>
        <span className="font-semibold">Lumi by Pampers</span><br />Google+P&amp;G<br />Baby Monitor &amp; AI Sleep Coaching
      </>
    ),
    chips: ["HW+SW UX", "AI", "Mobile", "Consumer"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Lumi_Hero.png?raw=true",
  },
  {
    title: "First-ever FDA approved clinical-grade watch to monitor atrial fibrillation in the US",
    desc: (
      <>
        <span className="font-semibold">Verily</span><br />Study Watch
      </>
    ),
    chips: ["HW+SW UX", "Wearables", "Mobile", "Healthcare"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/VW_hero.png?raw=true",
  },
  {
    title: "Fold four centuries of Ming dynasty heritage into modern urban living.",
    desc: (
      <>
        <span className="font-semibold">M-ing</span><br />Foldable Ming Style Armchair
      </>
    ),
    chips: ["Industrial Design", "Furniture"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Ming_hero.png?raw=true",
  },
  {
    title: "Accurate, fast, easy-to-use network planning over a web browser.",
    desc: (
      <>
        <span className="font-semibold">Google</span><br />Network Planner<br />Web-based Network Planning Tool
      </>
    ),
    chips: ["UX Design", "Web"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/google_networkplanner_hero_1.png?raw=true",
  },
  {
    title: "The next generation of cyber security",
    desc: (
      <>
        <span className="font-semibold">Trend Micro</span><br />Official Website Visual Refreshment
      </>
    ),
    chips: ["UX Design", "Visual Design", "Web"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/TMCOM_Hero.jpg?raw=true",
  },
  {
    title: "Use system-modeling to address complex challenges.",
    desc: (
      <>
        <span className="font-semibold">Eli Lily</span><br />Automated Insulin Delivery System
      </>
    ),
    chips: ["System Design", "Design Strategy"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/lilly_hero_1.png?raw=true",
  },
  {
    title: "Speed up the process of UX developing",
    desc: (
      <>
        <span className="font-semibold">Trend Micro</span><br />Mac OS User Interface Design system
      </>
    ),
    chips: ["UX Design", "Design System", "MacOS"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/TMUI_hero.png?raw=true",
  },
  {
    title: "Engineering a safer drive through precision eye-tracking research",
    desc: (
      <>
        <span className="font-bold">SCID UX Lab</span><br />Automobile Augmented Reality Research
      </>
    ),
    chips: ["Research", "Eye-tracking", "AR"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Eye_track_hero.png?raw=true",
  },
  {
    title: "Unleash the next generation of niche fashion through community-driven crowdfunding.",
    desc: (
      <>
        <span className="font-bold">Debut</span><br />Crowdfunding platform for niche fashion
      </>
    ),
    chips: ["UX Design", "Art Direction", "Mobile", "Web"],
    img: "https://raw.githubusercontent.com/shunweiwilson/image-storage/refs/heads/main/Debut_hero.jpg",
  },
  {
    title: "Curate a boundless virtual exhibition that connects young designers with industry recruiters.",
    desc: (
      <>
        <span className="font-bold">The Stage</span><br />Virtual Designer Exhibition/Event
      </>
    ),
    chips: ["UX Design", "VR/AR"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Stage_Hero.png?raw=true",
  },
  {
    title: "Empowering older adults to navigate the noise of the digital information bubble",
    desc: (
      <>
        <span className="font-bold">Fye</span><br />Fact Check AI-Agent
      </>
    ),
    chips: ["UX Design", "Research", "AI"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Fye_hero.jpg?raw=true",
  },
  {
    title: "Alleviate the academic drop-off of long summers with a continuous, balanced schedule.",
    desc: (
      <>
        <span className="font-bold">The New School of San Francisco</span><br />Equity School Calendar and Remote Learning
      </>
    ),
    chips: ["Service Design", "Research", "Education"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/NSSF_hero.jpg?raw=true",
  },
  {
    title: "Designing the lens through which we will remember our first lunar vacations",
    desc: (
      <>
        <span className="font-bold">Capture 2025</span><br />Rental Camera System on Moon
      </>
    ),
    chips: ["Industrial Design", "Speculative Design"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Capture_hero.jpg?raw=true",
  },
  {
    title: "“收乾\": The art of distilling chaotic thoughts into harmonious design",
    desc: (
      <>
        <span className="font-bold">Shou-gan “收乾” 2015</span><br />SCID Design Exhibition Art Direction
      </>
    ),
    chips: ["Art Direction", "Exhibition Design", "Curation"],
    img: "https://raw.githubusercontent.com/shunweiwilson/image-storage/refs/heads/main/SG_hero_1.avif",
  },
  {
    title: "Bridging the gap between domestic aesthetics and emergency preparedness.",
    desc: (
      <>
        <span className="font-bold">FOLD</span><br />Fire Extinguisher
      </>
    ),
    chips: ["Industrial Design", "Home"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Fold_hero.jpg?raw=true",
  },
  {
    title: "It’s my pleasure",
    desc: (
      <>
        <span className="font-bold">Pleasure</span><br />Art Sculpture
      </>
    ),
    chips: ["Experimental Art", "Design"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Pleasure_hero_01.jpg?raw=true",
  },
  {
    title: "Rethinking the wheel by studying the survival strategies of the insect world",
    desc: (
      <>
        <span className="font-bold">6, Locomotion</span><br />Experimental Mobility
      </>
    ),
    chips: ["Experimental Art", "Design"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/6_hero_3.png?raw=true",
  },
  {
    title: "Every little makes a mickle",
    desc: (
      <>
        <span className="font-bold">Mickle</span><br />Lighting
      </>
    ),
    chips: ["Experimental Art", "Design"],
    img: "https://github.com/shunweiwilson/image-storage/blob/main/Mickle_hero.jpg?raw=true",
  }
];

// Split explores into chunks of 6 items per slide (2x3 grid) once outside the render
const slideChunks = Array.from({ length: Math.ceil(explores.length / 6) }).map((_, slideIndex) => {
  return explores.slice(slideIndex * 6, slideIndex * 6 + 6);
});

function Explore() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      // Calculate scroll based on the specific element width to snap perfectly
      const scrollAmount = scrollRef.current.firstElementChild?.clientWidth || scrollRef.current.clientWidth;
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <section id="more" className="py-8 lg:py-10 px-6 bg-white border-t border-[#111111] scroll-mt-[68px]">
      <div className="max-w-[1600px] mx-auto">
        <FadeUp>
          <div className="flex flex-row items-center gap-1 md:gap-2 mb-12">
            <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-normal tracking-[-0.03em] leading-[1.2em]">
              Explore beyond
            </h2>
            
            {/* Navigation Arrows */}
            <div className="flex shrink-0 text-[clamp(2.5rem,5vw,4.5rem)] pt-[0.1em]">
              <button 
                onClick={() => handleScroll('left')}
                className="flex items-center justify-center hover:opacity-40 cursor-pointer transition-opacity focus:outline-none shrink-0" 
                aria-label="Previous"
              >
                <ArrowLeft strokeWidth={1.5} size="1em" />
              </button>
              <button 
                onClick={() => handleScroll('right')}
                className="flex items-center justify-center hover:opacity-40 cursor-pointer transition-opacity focus:outline-none shrink-0" 
                aria-label="Next"
              >
                <ArrowRight strokeWidth={1.5} size="1em" />
              </button>
            </div>
          </div>
        </FadeUp>
        
        <FadeUp delay={100} className="relative">
          {/* Carousel Track with negating margins/padding to prevent zoom cut-off */}
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-6 lg:gap-10 pt-6 pb-12 -mt-6 -mb-12 hide-scrollbar" 
          >
            {/* Display pre-computed slide chunks */}
            {slideChunks.map((slideItems, slideIndex) => (
                <div key={slideIndex} className="w-[85vw] md:w-[90vw] lg:w-[88vw] shrink-0 snap-start">
                  {/* 88vw width on large screens to guarantee a clear hint of the next slide */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 md:gap-x-12 gap-y-6 lg:gap-y-6 items-start">
                    {slideItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`block group transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] origin-left ${
                          hoveredTitle === item.title 
                            ? 'scale-[1.05] opacity-100 z-10' 
                            : hoveredTitle 
                              ? 'opacity-30 scale-100 z-0' 
                              : 'opacity-100 scale-100 z-0'
                        }`}
                        onMouseEnter={() => setHoveredTitle(item.title)}
                        onMouseLeave={() => setHoveredTitle(null)}
                      >
                        <hr className="border-[#111111] w-full mb-6 transition-opacity duration-500" />
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 lg:gap-x-6 gap-y-4 sm:gap-y-0 items-start">
                          
                          {/* Text Block - Adjusted to col-span-7 so images are comfortably smaller vertically */}
                          <div className="sm:col-span-7 flex flex-col gap-6">
                            <p className="text-lg md:text-xl font-normal leading-[1.25em] tracking-normal pr-2">
                              <a href="#contact" className="inline bg-gradient-to-r from-yellow-300 to-yellow-300 bg-no-repeat bg-[position:0_95%] bg-[length:0%_30%] group-hover:bg-[length:100%_30%] transition-[background-size] duration-500 ease-out">
                                {item.title}
                              </a>
                            </p>
                            <div className="flex flex-col gap-3 md:gap-4 items-start">
                              <p className="text-sm md:text-base text-[#333333] leading-[1.3em] pr-2">{item.desc}</p>
                              {item.chips && item.chips.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {item.chips.map((chip, i) => (
                                    <span key={i} className="px-3 py-[0.15rem] text-[0.75rem] md:text-sm font-medium border border-[#bbbbbb] text-[#666666] tracking-wide rounded-full group-hover:border-[#111111] group-hover:text-[#111111] transition-colors duration-500">
                                      {chip}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Image Block - Adjusted to col-span-5 to preserve aspect ratio while saving height */}
                          <div className="sm:col-span-5">
                            <a href="#contact" className="block w-full aspect-[16/9] overflow-hidden rounded-sm bg-[#f2f2f2]">
                              <img src={item.img} className="w-full h-full object-cover transform group-hover:scale-[1.03] transition-transform duration-700 ease-out" alt={item.title} />
                            </a>
                          </div>
                          
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

const clientData = [
  { items: [
    { name: "Google", url: "https://about.google/" },
    { name: "YouTube", url: "https://www.youtube.com/" },
    { name: "P&G", url: "https://us.pg.com/" },
    { name: "Eli Lilly", url: "https://www.lilly.com/" },
    { name: "Trend Micro", url: "https://www.trendmicro.com/" }
  ] },
  { items: [
    { name: "HTC-DeepQ", url: "https://www.htc.com/" },
    { name: "Verily Life Sciences", url: "https://verily.com/" },
    { name: "CviLux Group", url: "https://www.cvilux.com/" },
    { name: "California College of the Arts", url: "https://www.cca.edu/" },
    { name: "ADPList", url: "https://adplist.org/" }
  ] },
  { items: [
    { name: "Dubberly Design Office", url: "https://www.dubberly.com/" },
    { name: "Dong Hai Hospital", url: null },
    { name: "The Crucible", url: "https://www.thecrucible.org/" },
    { name: "New School of San Francisco", url: "https://www.newschoolsf.org/" },
    { name: "Bridge Consulting", url: null }
  ] }
];

function Footer() {
  return (
    <footer id="about" className="bg-[#111111] text-white py-24 px-6 scroll-mt-[68px]">
      <div className="max-w-[1600px] mx-auto">
        <FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 gap-x-8 md:items-start">
            
            {/* Nested wrapper for Info and Text so they match each other's height */}
            <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-9 gap-y-16 gap-x-8 items-stretch">
              {/* About Info */}
              <div className="md:col-span-4 lg:col-span-3 flex flex-col justify-between">
                <div>
                  <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-normal tracking-[-0.03em] leading-[1.2em]">About</h2>
                </div>
                <div className="mt-12 md:mt-0">
                  <p className="text-[#aaaaaa] text-lg leading-[1.3em] flex flex-col items-start gap-1">
                    <a href="mailto:shunweiwilson@gmail.com" className="link-underline hover:text-white transition-colors w-fit break-all sm:break-normal">shunweiwilson@gmail.com</a>
                    <a href="https://www.linkedin.com/in/shunweiwilson/" target="_blank" rel="noopener noreferrer" className="link-underline hover:text-white transition-colors w-fit">LinkedIn</a>
                    <a href="https://www.google.com/maps/place/San+Francisco+Bay+Area,+CA/" target="_blank" rel="noopener noreferrer" className="link-underline hover:text-white transition-colors w-fit">San Francisco, CA</a>
                  </p>
                </div>
              </div>

              {/* About Text */}
              <div className="md:col-span-5 md:col-start-5 lg:col-span-6 lg:col-start-4">
                <div className="text-[#aaaaaa] text-lg font-normal leading-[1.4em] tracking-normal space-y-8">
                  <p>
                    Wilson Wu is a design leader working at the intersection of hardware, software, and story. He creates positive impact for startups, in-house teams, agencies, and freelance projects across the world.
                  </p>
                  <p>
                    Currently at YouTube, he advances the televison experience—pushing the next wave of TV interactivity for impact at a global scale. He also serves as Industry Professional Advisor at California College of the Arts, bridging the gap between academic and industries.
                  </p>
                  <p>
                    In his former role at Verily (Google X’s life sciences arm), Wilson was a founding designer on multiple innovative hardware + software intergrated UX projects. His past roles also include Google Fi, Dubberly Design Office, HTC and Trend Micro.
                  </p>
                  <p>
                    His work has been recognized by Fast Company’s Innovation by Design (Best Design North America, 2023; Health, 2023), IDSA’s International Design Excellence Awards (Bronze; People’s Choice, 2023), the IxDA Interaction Awards (Shortlist, 2024), the Google GUXIES (Service Design Winner, 2024), and the YODEX Venture Challenge (Bronze, 2018). He also served as judge in Google GUXIES 2025.
                  </p>
                  <p>
                    He holds an MDes in Interaction Design (HCI) from California College of the Arts, with prior studies at National Taiwan University of Science and Technology and a B.A. in Industrial Design from Shih Chien University.
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Image */}
            <div className="md:col-span-3 md:col-start-10 h-[50vh] md:h-[60vh] rounded-sm overflow-hidden">
              <img 
                src="https://github.com/shunweiwilson/image-storage/blob/main/Wilson_Hero_1.png?raw=true" 
                className="w-full h-full object-cover" 
                alt="Wilson Wu" 
              />
            </div>
          </div>
        </FadeUp>

        {/* Partnered Organizations */}
        <FadeUp delay={100}>
          <div className="mt-32 pt-16 border-t border-[#333333]">
            <h3 className="text-[clamp(1.5rem,3vw,2.5rem)] font-normal tracking-[-0.03em] leading-[1.2em] mb-12">
              Notable partnered organizations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {clientData.map((col, idx) => (
                <div key={idx} className="flex flex-col gap-4">
                  <div className="text-lg md:text-xl font-normal leading-[1.4em] tracking-normal space-y-4 text-[#aaaaaa]">
                    {col.items.map((item, i) => (
                      <p key={i}>
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="link-underline hover:text-white transition-colors group inline-flex items-center gap-1">
                            {item.name} <ArrowRight size={18} strokeWidth={2} className="inline-block transition-transform duration-300 group-hover:-rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1" />
                          </a>
                        ) : (
                          `${item.name}`
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* Big Footer Logo */}
        <FadeUp delay={200}>
          <div id="contact" className="mt-20 pt-20 border-t border-[#333333] mb-20 flex justify-start scroll-mt-24">
            <h2 className="text-[clamp(3.5rem,8vw,7rem)] font-normal tracking-[-0.04em] text-white leading-[1.1em] text-left max-w-5xl">
              If you are interested in learning more, let's connect and talk.
            </h2>
          </div>
        </FadeUp>
        
        {/* Credits */}
        <div className="text-[#aaaaaa] text-base mb-0">
          <a href="mailto:shunweiwilson@gmail.com" className="link-underline hover:text-white transition-colors">shunweiwilson@gmail.com</a> | <a href="https://www.linkedin.com/in/shunweiwilson/" target="_blank" rel="noopener noreferrer" className="link-underline hover:text-white transition-colors">LinkedIn</a> | Appreciate your patience, as most of my projects are confidential | Now we roll special thanks below
        </div>
      </div>

      {/* News Ticker */}
      <div className="w-full overflow-hidden border-t border-[#333333] py-4 mt-4 flex">
        <div className="flex whitespace-nowrap animate-marquee text-[#aaaaaa] text-base w-max">
          <span className="pr-12">Thanks for opening my eyes to new stages of opportunity and strength. I am grateful for your guidance, support and kindness. Albert Wu • Anuprita Ranade • Ashley Kao • Austin Lin • Blake Terry • Bryna Tsai • Erik Lack • Federico Villa • Gina Hsu • Hugh Dubberly • Infinity*8 • JC Yeh • Joe Hines • Jonathan Grossman • Kev Chang • Kristine Yuen • Larika Mallier • Lulu Yang • Mahesh Kantheti • Manta Wu • MDes C5 • Megan Chang • Mumin Yu • Nathan Chiu • Patty Tseng • Pei Chen • Po-han Lin • Purva Takkar • Quen Ho • Sanuree Gomes • Sarah Ludwig • Seana Chang • Shannon Fong • Shivankit Sethi • Team Nü • Ting-yi Huang • Will Bates • Will Wu • Ying Ying Liu • Young-wei Huang</span>
          <span className="pr-12">Thanks for opening my eyes to new stages of opportunity and strength. I am grateful for your guidance, support and kindness. Albert Wu • Anuprita Ranade • Ashley Kao • Austin Lin • Blake Terry • Bryna Tsai • Erik Lack • Federico Villa • Gina Hsu • Hugh Dubberly • Infinity*8 • JC Yeh • Joe Hines • Jonathan Grossman • Kev Chang • Kristine Yuen • Larika Mallier • Lulu Yang • Mahesh Kantheti • Manta Wu • MDes C5 • Megan Chang • Mumin Yu • Nathan Chiu • Patty Tseng • Pei Chen • Po-han Lin • Purva Takkar • Quen Ho • Sanuree Gomes • Sarah Ludwig • Seana Chang • Shannon Fong • Shivankit Sethi • Team Nü • Ting-yi Huang • Will Bates • Will Wu • Ying Ying Liu • Young-wei Huang</span>
        </div>
      </div>
    </footer>
  );
}

// --- Main App Entry ---

export default function App() {
  return (
    // Top-level wrapper applying system typography constraints
    <div className="font-['Helvetica_Neue',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] text-[#111111] bg-white antialiased overflow-x-hidden selection:bg-[#111111] selection:text-white">
      <Header />
      <main className="min-h-screen">
        <Hero />
        <Projects />
        <Explore />
      </main>
      <Footer />
    </div>
  );
}