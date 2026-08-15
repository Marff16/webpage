(function () {
  window.siteProjects = [
    {
      id: 'personal-website',
      title: {
        en: 'Personal Website',
        de: 'Persönliche Website'
      },
      summary: {
        en: 'This site - designed and built from scratch with static HTML, CSS, and JavaScript.',
        de: 'Diese Seite — von Grund auf mit statischem HTML, CSS und JavaScript gebaut.'
      },
      tags: ['HTML', 'CSS', 'JavaScript', 'GitHub Pages'],
      href: {
        en: 'pages/en/projects/personal-website/',
        de: 'pages/en/projects/personal-website/'
      }
    },
    {
      id: 'heptascript',
      title: {
        en: 'Heptopod Translator',
        de: 'Heptopod Translator'
      },
      summary: {
        en: 'An experimental English-to-Heptopod glyph generator inspired by Arrival, built with Stable Diffusion, LoRA fine-tuning, and FastAPI.',
        de: 'Ein experimenteller Generator, der englische Sätze in Heptopod-Glyphen aus Arrival übersetzt — mit Stable Diffusion, LoRA-Finetuning und FastAPI.'
      },
      tags: ['Python', 'PyTorch', 'Stable Diffusion', 'LoRA', 'FastAPI', 'NLP'],
      href: {
        en: 'pages/en/projects/heptascript/',
        de: 'pages/en/projects/heptascript/'
      }
    },
    {
      id: 'vocalis',
      title: {
        en: 'Vocalis',
        de: 'Vocalis'
      },
      summary: {
        en: 'A self-hosted voice cloning app built on Chatterbox: learn a voice from a short sample, then speak any text back in it with low-latency, chunked generation.',
        de: 'Eine selbst gehostete App zum Klonen von Stimmen, gebaut auf Chatterbox: eine kurze Aufnahme genügt, danach spricht sie beliebige Texte in dieser Stimme — stückweise erzeugt und dadurch fast ohne Verzögerung.'
      },
      tags: ['Python', 'PyTorch', 'Chatterbox', 'FastAPI', 'Web Audio API', 'TTS'],
      href: {
        en: 'pages/en/projects/vocalis/',
        de: 'pages/en/projects/vocalis/'
      }
    }
  ];
})();
