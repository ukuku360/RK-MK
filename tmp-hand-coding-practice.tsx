// Practice-only scratch file.
// This file is intentionally not imported by the app.
// You can type anything here during a coding demo.

type DemoIdea = {
  title: string;
  status: 'thinking' | 'building' | 'done';
};

const demoIdeas: DemoIdea[] = [
  { title: 'Improve event flow', status: 'thinking' },
  { title: 'Polish admin tools', status: 'building' },
];

function explainIdea(idea: DemoIdea) {
  return `${idea.title}: ${idea.status}`;
}

console.log(demoIdeas.map(explainIdea));
