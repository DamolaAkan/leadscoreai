// "Who it's for": what people enrol in when they join LeadScoreAI (Seth Godin's
// who it's for / the change we seek to make / what it's for). One copy of the
// words, used by the /who-its-for page and the lifecycle email. Source: Damola's
// Module 1 doc, "The psychology of scorecards".

export type Point = { lead?: string; text: string };
export type Block =
  | { kind: "p"; text: string; lead?: string }
  | { kind: "list"; items: Point[] }
  | { kind: "h3"; text: string };
export type Section = { heading: string; blocks: Block[] };

export const WHO_ITS_FOR_TITLE = "Who LeadScoreAI is for";

export const WHO_ITS_FOR_INTRO =
  "LeadScoreAI is not for every business. It is for owners who value their time, their team's time and qualified leads, and it starts with lead qualification.";

export const WHO_ITS_FOR: Section[] = [
  {
    heading: "Who it's for",
    blocks: [
      { kind: "p", text: "LeadScoreAI is for founders who care about five things:" },
      {
        kind: "list",
        items: [
          { lead: "Their time", text: ", and the time their sales team spends on enquiries." },
          { lead: "Optimising their sales process", text: ", not just making the next sale." },
          { lead: "Lead qualification", text: ": knowing who is serious before anyone replies." },
          { lead: "Their data", text: ": who their customers are, what they want, and how ready they are to buy." },
          { lead: "Prepping their customers", text: ": taking buyers on a journey so the sale is easy, not forced." },
        ],
      },
    ],
  },
  {
    heading: "Who it's not for",
    blocks: [
      {
        kind: "p",
        text: "If you don't value your time, your team's time or qualified leads, you won't value LeadScoreAI. It is also not for:",
      },
      {
        kind: "list",
        items: [
          {
            lead: "Businesses that still need to talk to everybody.",
            text: " Early on, every conversation teaches you something. Qualification comes later.",
          },
          { lead: "Businesses doing no marketing.", text: " No enquiries means nothing to qualify." },
          {
            lead: "Founders who don't care who their customers are",
            text: ", and have no interest in understanding them or doing market research.",
          },
          {
            lead: "Founders who only want the money.",
            text: " You want the sale, but LeadScoreAI is for getting it in a way that makes selling easier and faster, because the customer arrives prepped.",
          },
        ],
      },
    ],
  },
  {
    heading: "The change we seek to make",
    blocks: [
      { kind: "p", text: "A scorecard is not just a form. Every time someone takes one, five things happen." },
      { kind: "h3", text: "1. You qualify the lead" },
      {
        kind: "p",
        text: "Most businesses get enquiries from everyone, and their Instagram and WhatsApp DMs get swamped. A scorecard sorts serious buyers from browsers before you or your sales team reply, so your time goes to the right people.",
      },
      {
        kind: "p",
        lead: "A true story:",
        text: " someone once sent me a screenshot of my own home in my DMs. It was really scary. When anyone can message you, you need a filter between you and them.",
      },
      {
        kind: "p",
        lead: "Speed to lead is real, and it is part of our ethos.",
        text: " Talking to 1,000 leads one by one takes weeks. If the scorecard has already found your 20 hot leads, your sales team starts there, and those leads convert faster.",
      },
      { kind: "h3", text: "2. You educate and prep the lead" },
      {
        kind: "p",
        text: "A doctor doesn't hand you a prescription the moment you sit down. They diagnose first. They ask questions, and while you answer, you start to understand the problem yourself. That prepares you for the solution.",
      },
      {
        kind: "p",
        text: "A scorecard does the same. The questions prep your customer for the solution they are about to get.",
      },
      { kind: "h3", text: "3. You learn who will pay" },
      {
        kind: "p",
        text: "We don't just build scorecards. We build them to find your buyers. Our flagship process, willingness to pay, adds questions about:",
      },
      {
        kind: "list",
        items: [
          { lead: "Timing", text: ": when they want to start" },
          { lead: "Affordability", text: ": what they can spend" },
          { lead: "Commitment", text: ": how serious they are" },
          { lead: "Availability", text: ": whether they can actually show up and follow through" },
        ],
      },
      {
        kind: "p",
        text: "People will sometimes lie. But across many leads, the pattern holds, and it gets more accurate the more leads you have, especially past 1,000.",
      },
      { kind: "h3", text: "4. You get data to build the business on" },
      {
        kind: "p",
        text: "You see who your best customers are, straight from the leads you are already generating. You can work with that data and build your business around it.",
      },
      { kind: "h3", text: "5. You enrol customers in a journey" },
      {
        kind: "p",
        text: "It is not \"let me just get the money\". You still want the sale, but the scorecard walks the customer toward it, so when they reach you the sale is easy.",
      },
    ],
  },
  {
    heading: "What it's for",
    blocks: [
      {
        kind: "p",
        text: "In its simplest form: you know your best customers straight from the leads you're already generating, and you build your business on that data.",
      },
    ],
  },
];
