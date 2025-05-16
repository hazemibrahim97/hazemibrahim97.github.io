const projects = [
    {
        title: 'NBA BoxScorigami',
        description: 'A tool to visualize NBA box scores and find interesting player patterns. You can see the distribution of occurences of different stat pairs, and retrieve box scores for any player performance since 1990.',
        image: null,
        technologies: ['Python', 'NatStat', 'Streamlit'],
        github: 'https://github.com/hazemibrahim97/Boxscorigami',
        demo: 'https://boxscorigami.streamlit.app/',
        featured: true
    },
    {
        title: 'Citation Analytics Dashboard',
        description: 'A citation analytics dashboard using OpenAlex which allows users to explore citation accumulation patterns of their favorite scientists. Using the dashboard, you can see how authors collaborate, where they publish, who they publish with, and who cites them most.',        
        technologies: ['Python', 'OpenAlex', 'Streamlit'],
        github: 'https://github.com/hazemibrahim97/CitationDashboard',
        demo: 'https://citationdashboard.streamlit.app/',
        featured: true
    },
    {
        title: 'Finding High Degree Nodes through Random Walks',
        description: 'A tool to visualize random walks on a graph in their pursuit of finding the highest degree nodes in the graph.',
        technologies: ['Javascript'],
        demo: 'https://observablehq.com/d/790d9385fe47817d',
        featured: true
    },

];

console.log('Projects module loaded:', projects);
export default projects; 