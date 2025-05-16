const publications = [
    {
        title: 'Large Language Models are often politically extreme, usually ideologically inconsistent, and persuasive even in informational contexts',
        authors: ['Nouar AlDahoul', 'Hazem Ibrahim', 'Matteo Varvello', 'Aaron Kaufman', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'arXiv preprint arXiv:2505.04171',
        year: 2025,
        pdf: 'https://arxiv.org/pdf/2505.04171.pdf',
        featured: true
    },
    {
        title: 'TikTok\'s recommendations skewed towards Republican content during the 2024 U.S. presidential race',
        authors: ['Hazem Ibrahim', 'Daniel Jang', 'Nouar AlDahoul', 'Aaron Kaufman', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'arXiv preprint arXiv:2501.17831',
        year: 2025,
        pdf: 'https://arxiv.org/pdf/2501.17831.pdf',
        featured: false
    },

    {
        title: 'Neutralizing the Narrative: AI-Powered Debiasing of Online News Articles',
        authors: ['CW Kuo', 'Kevin Chu', 'Nouar AlDahoul', 'Hazem Ibrahim', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'arXiv preprint arXiv:2504.03520',
        year: 2025,
        pdf: 'https://arxiv.org/abs/2504.03520',
        featured: true
    },
    {
        title: 'Analyzing political stances on Twitter in the lead-up to the 2024 US election',
        authors: ['Hazem Ibrahim', 'Farhan Khan', 'Hend Alabdouli', 'Maryam Almatrooshi', 'Tran Nguyen', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'arXiv preprint arXiv:2412.02712',
        year: 2024,
        pdf: 'https://arxiv.org/pdf/2412.02712.pdf',
        featured: false
    },
    {
        title: 'A Longitudinal Analysis of Racial and Gender Bias in New York Times and Fox News Images and Articles',
        authors: ['Hazem Ibrahim', 'Nouar AlDahoul', 'Syed Mustafa Ali Abbasi', 'Fareed Zaffar', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'arXiv preprint arXiv:2410.21898',
        year: 2024,
        pdf: 'https://arxiv.org/pdf/2410.21898.pdf',
        featured: false
    },
    {
        title: 'Inclusive content reduces racial and gender biases, yet non-inclusive content dominates popular media outlets',
        authors: ['Nouar AlDahoul', 'Hazem Ibrahim', 'Minsu Park', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'arXiv preprint arXiv:2405.06404',
        year: 2024,
        pdf: 'https://arxiv.org/pdf/2405.06404.pdf',
        featured: true
    },
    {
        title: 'Citation manipulation through citation mills and pre-print servers',
        authors: ['Hazem Ibrahim', 'Fengyuan Liu', 'Yasir Zaki', 'Talal Rahwan'],
        journal: 'Scientific Reports',
        year: 2025,
        pdf: 'https://www.nature.com/articles/s41598-025-88709-7',
        featured: true
    },
    {
        title: 'Perception, performance, and detectability of conversational artificial intelligence across 32 university courses',
        authors: ['Hazem Ibrahim', 'Fengyuan Liu', 'Rohail Asim', 'Balaraju Battu', 'Sidahmed Benabderrahmane', 'Bashar Alhafni', 'Wifag Adnan', 'Tuka Alhanai', 'Bedoor AlShebli', 'Riyadh Baghdadi', 'et al.'],
        journal: 'Scientific Reports',
        year: 2023,
        doi: 'https://doi.org/10.1038/s41598-023-38964-3',
        pdf: 'https://www.nature.com/articles/s41598-023-38964-3.pdf',
        featured: true
    },
    {
        title: "YouTube's recommendation algorithm is left-leaning in the United States",
        authors: ['Hazem Ibrahim', 'Nouar AlDahoul', 'Sangjin Lee', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'PNAS Nexus',
        year: 2023,
        doi: 'https://doi.org/10.1093/pnasnexus/pgad264',
        pdf: 'https://watermark.silverchair.com/pgad264.pdf?token=AQECAHi208BE49Ooan9kkhW_Ercy7Dm3ZL_9Cf3qfKAc485ysgAAA34wggN6BgkqhkiG9w0BBwagggNrMIIDZwIBADCCA2AGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMzm6ArRDU1WsGC5h8AgEQgIIDMXdPECVcRzbCBBgi-nRVjDLBHwzG24RXC3ZNniHNKbGiEAoHVyePmm_03Yz4SWqYPcJcKRUOZoFBimZd36ViticzZm30NWn1Rx_ElUBMVxMZ-bRPe1va932JR46c9KVxeUevKwaBxF5LeDV1CqlbhYwQxRE3oSx_ClTIV8lfMmuK1SMplKNnnYCQmRmz1mjgVvgR7dPGOLfikV3KDFfCPeOAfpGfVMnEvcR9DO1JKEpTCJSbhOZaLvWVviaqButdWT9Xs0Av-2kD6XElRFJPkXVIOu-dMGpn716ZWFOK0oncIeUFZ1HiKB_sa-tTDhZ2KZNsGoF3allLQsxNmFvZS7WmxuPO5nCKY7O8AwCZYnXSuPA8VNOX7GmCftHI7-64Rmu1SkJBkvfRg_dEoSjjrjV-Gw4klh77vpVQFp18qjk3CsoIiAndjp3etZrWD6tE5OI_oHqjeIwRMYY2szItJT2BhxOWPdH4BLWM3a5QLxN6b7SHgkA1ZrfmrrZb7OeRzCtSRk_f8VPr-Ttnc5CMtUqilQN4L1_sMfEZ0No10flG_slob-dUeIFs4NEU0ph0EjNMUnjV_vXGjJ8usUNXpwQMCHRaXSMobS_dKI-dpu6dZlUCCtoTfD50JvSoiCKa6GXg3MHUO0JFmCUXRztbzRsUif8ViNVWbpP4M8C5GeW4GP4x0owqoLQoitZadkK1bICRQ4EfVxBkdsnYIVjeqr8tnj0aPeEcXj9bFJ5XTvuH9Zo0Tq-X1lmVSwdmMMuoNmxsRinBFjE0Oo-X1Ddfe7p204xf1or9BBYwPebOxhq4fvdX2G5yOd6MbBLAKip7UNu3ibShuLTRt9ficzLJBkN9kohCwzX0juD27JO_4qjofPHtqJExunCT77uX3ITuHmm9GuyWXzfst_FUGwB0v8fc7I94ZpLhoS8IJ9EvZEZV2hCJeve6HEM3zOBNLCwn6nk61txuwH6DMZG4YxOEKmO_A7OOlmQl5pgnepEoZsCyZuEh8HP_y5QQV9m1WRj6er0-lKjLJdlJcIHwDNqUWNTKevGQN60_gXBXqF3t_7XSIZ1aBjvGK5Cp7tK6jWKlkpc',
        featured: true
    },
    {
        title: 'Big Tech Dominance Despite Global Mistrust',
        authors: ['Hazem Ibrahim', 'Mikołaj Dębicki', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'IEEE Transactions on Computational Social Systems',
        year: 2024,
        pdf: 'https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=10379489',
        featured: true
    },
    {
        title: 'I Tag, You Tag, Everybody Tags!',
        authors: ['Hazem Ibrahim', 'Rohail Asim', 'Matteo Varvello', 'Yasir Zaki'],
        journal: 'Internet Measurement Conference',
        year: 2023,
        doi: 'https://doi.org/10.1145/3618257.3624834',
        pdf: 'https://dl.acm.org/doi/pdf/10.1145/3618257.3624834',
        featured: false
    },
    {
        title: 'Rethinking Homework in the Age of Artificial Intelligence',
        authors: ['Hazem Ibrahim', 'Rohail Asim', 'Fareed Zaffar', 'Talal Rahwan', 'Yasir Zaki'],
        journal: 'IEEE Intelligent Systems',
        year: 2023,
        doi: 'https://doi.org/10.1109/MIS.2023.3255599',
        pdf: 'https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=10111520',
        featured: false
    },
    {
        title: 'Gamification in Online Educational Systems',
        authors: ['Hazem Ibrahim', 'Walid Ibrahim'],
        journal: '6th International Conference on Higher Education Advances (HEAd\'20)',
        year: 2020,
        doi: 'https://doi.org/10.4995/HEAd20.2020.11238',
        pdf: 'https://riunet.upv.es/bitstream/handle/10251/145946/Ibrahim?sequence=1',
        featured: false
    }
];

console.log('Publications module loaded:', publications);
export default publications;
