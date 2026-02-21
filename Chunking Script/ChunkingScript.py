import json
import os
import re
from langchain.text_splitter import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

# 1. LOAD YOUR DOCUMENT from Tangerine Bot Knowledge Base.md
_kb_path = os.path.join(os.path.dirname(__file__), "Tangerine Bot Knowledge Base.md")
with open(_kb_path, encoding="utf-8") as _f:
    markdown_text = _f.read()

# --- legacy inline string kept only as a reference; no longer used ---
_INLINE_STUB = """# Tangerine Search Inc.: Holistic Company Overview & Insights

## I. Who We Are: Our Identity and Philosophy

### We’re Just as Picky as You Are

We partner with companies and employees to find their ideal match—and we’re serious about creating successful relationships. How are we different from every other recruiting agency? **We’re just as selective as you are.**

We realize that every person and organization has unique needs and aspirations. This drives every decision we make. We focus on real-life outcomes, not just numbers. We care about the impact of our work on people's lives and go the extra mile to ensure every hire is a happy one.

### Our Human-Centered Approach

We keep our process simple and transparent. We skip the traditional "sales call" and instead spend our energy relentlessly understanding every job post and candidate.

### Local Firm, Global Impact

Headquartered in the San Francisco Bay Area, we have employees across the country and work with job seekers internationally.

* **Women-Owned and Led Business**  
* **NGLCC Certified LGBT Business Enterprise**

### Diversity & Inclusion

**Why We Care:** Inclusion is central to our daily work, not just a legal footnote. We advocate for people from marginalized backgrounds to ensure they have a voice in key decisions and better compensation. We help our clients build genuinely inclusive hiring practices that minimize bias.

**Better for Business:** Your employees should reflect the lived experiences of your customers. Diversity in thought and problem-solving creates the psychological safety necessary for creative, solution-based productivity. When employees feel seen and valued, they perform better.

### Real Stories from Real People

> “I am thankful for Tangerine's dedication and conversations throughout this process. They have been the ultimate sounding board and support system for me.”  
> **— Matthew Bee, Product Manager at Curb**

> “My Tangerine recruiter assisted with salary negotiation, resulting in a compelling offer in just 24 hours. I highly recommend the Tangerine team to professionals seeking recruiting experts.”  
> **— Daniella Serquene, Commerce Consultant**

> “Katie has excelled in supporting my company with HR needs and compliance. Her methodical and direct approach is a perfect fit. I've gained valuable insights from her that aid me as a CEO.”  
> **— Marc Hernandez, CEO Postmarc**

---

## II. Our Services: Recruitment & HR Solutions

### 1. Recruiting for Employers

We deliver the talent you’ve been looking for. Many firms find candidates who meet a technical skillset; very few work as hard as we do to find people compatible with your company’s values, size, and structure. We bridge the gap to ensure long-term retention and happiness.

**Roles We Specialize In:**

* **Engineering:** Front-End, Back-End, Full Stack, QA, DevOps, Security, Systems, Gaming, and more.  
* **Product & Data:** Head of Product, Product Managers, Data Scientists, and Analysts.  
* **Design:** UX/UI and Interaction Designers, Accessibility Specialists.  
* **Customer Success:** Directors, Managers, and Associates.

**The Full-Service Process:**

1. **Kickoff:** We initiate our partnership and align on the vision.  
2. **Search:** We begin the targeted candidate search.  
3. **Review:** You receive a curated list of qualified candidates.  
4. **Execution:** We facilitate interviews, offer acceptance, and processing.

> “Tangerine Search came to our rescue. They came on-site to familiarize themselves with our culture and interviewed our hiring managers. This was beyond my expectations.”  
> **— Talat Tehranchi, Head of HR at Raxium**

### 2. Scalable HR Solutions

Expert HR knowledge at a fraction of the price. Pay only for what you need, as you need it. Unlike competitors with one-size-fits-all packages, we tailor our offerings to your specific stage of growth.

* **Compliance & Risk:** Mandatory employee training; RIF/Layoff compliance; Remote worker/ADA accommodations.  
* **DEI Strategy:** Aligning strategy to values; Attracting under-represented talent; Metrics tracking.  
* **Talent Management & Analytics:** Performance review rebuilds; Organizational design (titles/comp ranges); Labor budgeting.

---

## III. Strategic Insights and Resources (The Tangerine Blog)

### Category A: The Candidate's Perspective

#### Blog 1: Resume Q&A (January 17, 2024)

**I see so many templates and resume designs, what’s the best way to design my resume?**  
The biggest problem with most templates is that graphics and tables often cannot be read by the Applicant Tracking System (ATS). A simple text resume is your best bet. If you have a warm introduction, you can send a design-heavy version, but keep a text version ready.

**What’s with keywords?**  
Include them, but don't go overboard. Clearly list software by name and detail your responsibilities (e.g., using Excel to track customer data).

**Are video resumes the new trend?**  
Recruiters are busy. While interesting, a clear and concise text resume is still the most important tool.

**I’m just coming out of school; how do I make a resume?**  
List relevant academic projects and internship experience in detail.  
~* April Starlight*

#### Blog 15: Career Coach Partners (January 12, 2026)

We partner with experts to support your journey:

* **Eniola Abioye (UX Outloud):** Senior UX & Leadership.  
* **Dr. Kyle Elliott (Caffeinated Kyle):** Tech-focused executive coaching.  
* **Alex Lahmeyer (Boundless Arc):** Inclusive workplace design.  
* **Stephen Lu:** Coaching for shy introverts.  
* **Dr. Jaime Raygoza:** Burnout recovery and wellness.  
* **Kimberly Tate:** Salary negotiation and leadership roles.  
* **Anders Renee:** Astrology-based career reflection.

---

### Category B: The Hiring Manager’s Playbook

#### Blog 2: How to Interview (February 13, 2024)

1. **Be Prepared:** Create a skills rubric (must-haves vs. nice-to-haves) before searching.  
2. **Do Your Homework:** Review backgrounds ahead of time for specific questions.  
3. **Create Consistency:** Ask roughly the same questions to all candidates to compare problem-solving.  
4. **Be On Time:** Respect the candidate’s time investment.  
5. **Look for Insights:** Focus on *how* they solve problems, not just "correct" answers.  
6. **Move the Interview Around:** Don't let them get too comfortable; evaluate fit for the skills matrix.  
7. **Document:** Synthesize notes immediately while fresh.

#### Blog 7: Master Interview Techniques (November 13, 2024)

* **Structured Questions:** Ask the same core questions to minimize bias.  
* **Behavioral Questions:** "Tell me about a time..." reveals future performance.  
* **Cultural Fit:** Ask about their ideal work environment.  
* **Skills Tests:** Use short assignments to see real-world abilities.  
* **Be a Good Host:** Provide clear logistics for office visits or video calls.  
* **Involve the Team:** Get multiple perspectives.

#### Blog 17: Finding the Perfect Match (February 2, 2026)

Great hiring starts with planning. Before posting, define core responsibilities and autonomy levels. Assemble a tight interview loop (manager + 1-2 collaborators). Use assessments ethically ( finalist-only, <2 hours).  
**The Safe Approach:** Focus solely on qualifications. Avoid questions about age, family status, gender, race, religion, or politics.

---

### Category C: Attracting and Retaining Top Talent

#### Blog 3: How to Attract Top Talent (July 15, 2024)

1. Build a Strong Employer Brand.  
2. Offer Competitive Compensation/Benefits.  
3. Foster Career Development.  
4. Create a Positive Work Environment.  
5. Engage with Passive Candidates.  
6. Highlight Company Achievements.

#### Blog 6: 5 Reasons Employees Quit Managers, Not Jobs (October 8, 2024)

1. **Viewing Employees as Costs:** Leads to disengagement.  
2. **Internal Competition:** Damages team morale.  
3. **Negative Focus:** Diminishes motivation.  
4. **Taking Credit:** Breeds frustration.  
5. **Inaccessibility:** Leaves employees unsupported.  
*Solutions: Cultivate recognition, empower employees, and invest in professional development.*

#### Blog 8: Quality vs. Quantity (March 27, 2025)

Tangerine candidates are pre-vetted and sold on the opportunity. In 2025, flexibility is the key driver for top talent. A LinkedIn report found 94% of employees stay longer at companies that invest in their career development.

#### Blog 11: 4 Reasons a Healthy HR Team is Critical (July 15, 2025)

HR drives growth. Prioritize transparency, reward contributions, invest in growth, and promote work-life balance to create a resilient workforce.

---

### Category D: Process Optimization and Trends

#### Blog 9: 7 Ways to Speed Up Your Hiring Process (April 24, 2025)

Average time-to-fill rose to 70 days in 2025. To reduce this:

1. Foster a hiring culture. 2. Strengthen brand. 3. Maintain a pipeline. 4. Manage volume efficiently. 5. Enhance candidate experience. 6. Streamline interview stages. 7. Optimize the offer process.

#### Blog 10: Best Practices for Candidate Engagement (June 23, 2025)

Engagement leads to higher conversion.

* **Personalization:** Use names and specific role missions.  
* **Mobile Optimization:** 41% of job searches happen on phones.  
* **Clear CTAs:** Guide candidates to the next step.  
* **Feedback Loop:** Keep candidates informed of their status.

#### Blog 16: The Use of AI in Hiring (January 22, 2026)

AI is a tool, not a shortcut.

* **Value:** Interview transcription and visibility; top-of-funnel sourcing.  
* **Risks:** Compliance with state laws; data privacy; loss of human touch.  
* **Strategy:** AI should support people, allowing humans to interpret nuance and build trust.

#### Blog 4: The Future of Talent Acquisition (August 14, 2024)

Embrace hybrid recruitment models and empathy-driven leadership. Use automated scheduling and continuous feedback mechanisms to stay agile.

---

### Category E: Year-End Reviews and Future Strategy

#### Blog 12: 2025 End-of-Year Hiring Checkup (December 8, 2025)

Audit your funnel (Speed, Consistency, Brand). Evaluate filled roles—did they deliver impact? Re-engage past candidates in December to beat the January rush.

#### Blog 13: 2025 Wrap-Up (December 16, 2025)

A year of transformation:

* Implemented AI for speed, keeping focus on humans.  
* Launched RPO (Recruitment Process Outsourcing) for startups.  
* Expanded global footprint and strategic HR practice.

#### Blog 14: Hiring Resolutions for 2026 (January 2, 2026)

1. Commit to one true hiring partner.  
2. Treat candidate experience as a priority.  
3. Replace silence with signals.  
4. Train every interviewer as a brand ambassador.  
5. Set a feedback SLA (24-hour goal).  
6. Make rejections actionable.

#### Blog 5: Common Questions From Our Clients (September 9, 2024)

**Q: How to enhance digital engagement?** Use personalized communication and real-time feedback.  
**Q: Key trends?** Rise of AI, importance of employer branding, and hybrid work models.

---

## IV. Practical Applications: Recruitment Mock Interview Example

#### Intro and Discovery

**Summary:** The following is a mock interview of a Tangerine employee speaking with a prospective Client about recruiting services. Below is an (edited) transcript of that conversation.

**Client:** Hi. This is Stacey. I'm the head of TA for a mid-stage B2B company. We've been having trouble with the senior DevOps manager role, and I'm looking for agency support. Just wanted to hear a little bit more about Tangerine and if you guys can support this role.

**Tangerine:** Great, it sounds like a perfect match for us. Can you tell me more about your company?

**Client:** We're about 100 employees, about 20 of whom are on the engineering team, and I just got a budget for a senior DevOps manager role. And I'm on the market for agency support because currently, we are a recruiting team of zero. We have no recruiters. So we're looking for some help.

**Tangerine:** Okay, great.

**Client:** Oh, actually, we have one contract recruiter who works, like, part-time, but that's it. No full-time recruiting team. But I was hoping to hear a little bit more about Tangerine as a company and if this is a search that you guys can help with.

**Tangerine:** Absolutely. First of all, thank you so much for reaching out to contact us about your need. We would be so happy to help and support you with it. First off, DevOps is definitely a role that we can support. We support hiring for roles all across engineering, cybersecurity, anything front or back end, definitely DevOps, infrastructure, any type of role in that realm is definitely within our wheelhouse. And we've also got quite a few clients that are in software and around your size. A lot of the companies that we support are in that kind of growth phase, the in-between space between being a early stage startup and getting some funding and starting to really ramp up, and we can come in and help them with that pain point of of hiring. So I think it's a it's a really good match. Can I ask how did you hear about us?

**Client:** Yeah. It's a combination of Google search, and then I was also asking some colleagues around. So I found your website and then saw a connection on LinkedIn through a mutual connection.

**Tangerine:** Oh, wonderful. Well, that's great to hear. So if you could tell me a little bit more about your search, where do you need this person to work from? Do you have an office?

**Client:** Yes. So we're currently a full remote company, but there is a preference for Bay Area because we plan on having our first office probably somewhere in the Financial District. So right now, the search would be open for full remote in The United States, but if possible, with a preference for Bay Area candidates.

**Tangerine:** Okay. Great. Have you had any prior applicants on this role, or have you interviewed anybody through maybe the network of your current employees, any referrals, anything like that, or is this the very beginning of the search?

**Client:** Yeah. We've been passively trying to look. You know, our very small team, I've asked about referrals. And, unfortunately, I think a lot of the folks being referred are a little bit too junior. They haven't really had that managerial experience. And then right now, I'm finding strong ICs. But at the end of the day, I do need a very hands-on manager. And I think finding that, player-coach balance, someone who's, you know, still hands on, still codes, and has management experience has been a bit hard to find.

**Tangerine:** I definitely understand that. Yes. This is a search we are happy to help you with and it is well within our expertise. We have recently handled filled roles that were a mix of leadership, but also still hands-on working in the code base, and being able to communicate cross-functionally because you're in a start-up. And, also, since you are remote, it sounds like we also need someone who can collaborate asynchronously and really proactively to build rapport with those other folks that they're gonna be maybe managing and overseeing. So let me ask you. Do you already have budget approval for this role? Is it something that is on the horizon, or are you ready to start the search now?

**Client:** We're ready to start the search, but currently, the finance team is still kind of ironing out how much we can afford. So a part of my current search is really how much this is gonna cost us at the end of the day.

#### Pricing and Service Models

**Tangerine:** Absolutely. So we are pretty industry standard. We charge a 20% fee, which is 20% of the annual salary of the person you hire. Our work is guaranteed. So if for any reason that person doesn't work out, you bring them on, you think they're a great fit, and then you find out that for whatever reason, they're not the right match, we will replace that person. We will reinitiate the search and get you someone else. So it's worry-free.

**Client:** When you say annual salary, would that include just the base, or would it include other bonuses like sign-on or relocation bonus? How does that exactly work?

**Tangerine:** Yes. Great question. It is 20% of the person's annual base salary

**Client:** Gotcha.

**Tangerine:** The only time that would be different is if maybe you had a sales role or a role that was heavy on variable compensation. Some of those positions are maybe 50% commission. So what we do in that case, our fee becomes based off of OTE (on target earnings) for a person in that role. But let me ask you. Are you planning to do additional hiring beyond this this DevOps manager role, or are you thinking this is just the one headcount right now?

**Client:** As of now, we only have this one headcount, but that might change probably in next quarter. So a little bit of a TBA.

**Tangerine:** Okay. Great. Well, there's another way that we could support you, which is in our embedded recruiting, sort of an RPO style of recruiting support. Are you already aware of, or has anybody talked to you about maybe doing RPO support for your team?

**Client:** I have not heard this option. Please do tell more.

**Tangerine:** Yes. Absolutely. So this is an option that can be really great for our clients that are in that kind of growth stage. Maybe they've just gotten around the funding or for whatever reason, they have quite a bit of headcount coming in, where we actually provide you a recruiting team. So you don't have to take on recruiting employees. You don't have to purchase additional software. For example, those LinkedIn recruiter licenses are very expensive. We can save you all of the fees on all of that. For a flat rate monthly fee, we will manage multiple searches for you from end to end. So that means we would have an initial meeting kickoff with the hiring manager where we go through all the details, get all the documentation, help them with planning the interview process, which can include also training them on how to interview. A lot of our start up clients have folks on the interview panel that maybe have never been an interviewer before, so we get everything set up for them, train them how to interview and manage the search end-to-end. And then from there, we take your roles that you need to hire for, and we market them to our network and bring in a very healthy pipeline of top-of-funnel candidates, and then just completely manage the search from there.

**Client:** Gotcha.

**Tangerine:** It really lightens the load and can help with either high-growth moments and supports you using our team and tools if you don't have an internal recruiting function, which it kind of sounds like you might be in that position.

**Client:** Gotcha. Gotcha. And then pricing-wise, is this also, like, a percentage cut per roll? Or how would the pricing for this model work?

**Tangerine:** Right. So, for the RPO services, it is a monthly fee. It starts at $5,000 monthly, so it's a really strong cost savings if you look at what it would cost to bring on even one recruiter and one license for any software. Right? So it really depends on how many searches we're doing concurrently. If it's more than two or three, that number might be a bit higher, but we can, you know, go into those details a bit more if that's something that you decide you might need down the line.

**Client:** Gotcha. Okay. Yeah. I think it's definitely something I need to take back to the finance team. So if you had any resources that you can share with me later on, that would be great just for me to be able to take a look at.

**Tangerine:** Mhmm.

#### Process, Network, and Speed

**Client:** And then I also had a couple of questions for you. As you know, we're on a search to find the right agency to help us with this. So I just had a couple of kind of standard questions to hear a little bit more about Tangerine. How is the team structured for a search like this, and how many recruiters will be working on this role?

**Tangerine:** Yeah. Absolutely. So our team is, first of all, experienced recruiters. We're really a team of experts, and you would have a dedicated account manager. And for a search like the individual search, you would have a dedicated recruiter who would be going out sourcing candidates, doing precision searching for that right talent. And this helps you because it just reduces so much noise. Whoever the hiring manager is on your team, they will meet that person in the kickoff, and we are going to get right to the heart of what you're looking for so that we can go out and find that exact right person. We've been in business since 2019, and a lot of the clients that we work with currently have been with us from the beginning. So it's very important to us also that we find the right match. Just as you're evaluating potential partners. We also look for companies that could be great to work with over many years that we can help with their growth and find the best team members so they can really be successful out in the market.

**Client:** I'm glad to hear that I get a dedicated team to be working on my senior DevOps manager role. A follow-up question to how you guys operate, but your current talent pool, how are your candidates typically sourced? Would we be expecting more passive or active candidates for a role like this?

**Tangerine:** 75% \\of our Rolodex and our clientele are folks that, we've placed before. We have a really wide network. And specifically for your DevOps engineer role, we've actually filled probably 30 plus DevOps roles in the past. So we were well in tune with Bay Area DevOps engineers because we've had a history of placing this exact same role in multiple companies. So that's where we would first start, the internal connection that we've built over time. And then on top of that, we've invested in a lot of modern-day sourcing tools using AI. And that's something that I can say, while we have 75% of the candidates coming from our personal Rolodex, the remaining 25, is heavily sourced. Once we've sourced a targeted group of qualified talent, we set up multiple rounds of drip campaigns. Because your search is fully remote, I think that really broadens the net, too.

I also want to let you know that we really reduce the noise on fake and fraudulent candidates, which are flooding LinkedIn. They're flooding the job market in general. A lot of those are AI-generated and not necessarily a real person. So we cut through all of that noise. Everyone that we present to you is someone that we've screened, met with, qualified, and who can do the job. So all your team has to do is pick between a small handful of highly qualified folks who have been pitched on your opportunity and are interested in joining your start-up and are excited. We provide you with all the information, including that person's motivation, their salary expectations, where they're located, and whether they've had startup experience before. All of the details that you would need to know, you get at a glance. We do all the legwork and heavy lifting for you, and we've got access to a very wide talent pool that is not exclusively the folks you might find on LinkedIn or that are applying to jobs and a pretty strong referral network as well.

**Client:** Oh, perfect. Perfect. I think we have to be really confident that our agency has an established network. And because I think that's what really sets apart any agency for me. So I'm glad to hear that you have a strong network.

**Tangerine:** I want to also share that we are particularly well-suited for startups. we can call someone who is not necessarily looking for a job, and can get them excited about your company that they have never heard of before the moment we just called them, and get them to a point where they're ready to leave their current stable employment to join your company. And that's what you get when we present someone over. They are already excited about the opportunity as we've presented it. So in addition to recruiting for you, we're not just throwing resumes at you. During the search, we are doing marketing for you and PR and also kind of advertising your start-up business to the people in your industry.

**Tangerine:** You need 10 x engineers. We have 10 x recruiters.

**Tangerine:** What a lot of our clients tell us is most important thing we deliver on well, is our speed. For example, the fact that we present highly qualified candidates in two to three business days.

**Client:** Yeah. Oh, yes. Yes.

**Tangerine:** You will see submissions from us very quickly. We recently filled a head of sales for North America, and the person who ultimately was hired, we presented 48 hours into the search.

**Client:** Oh, wow.

**Tangerine:** So, yeah. We're speed AND quality.

#### Technical Vetting and Closing

**Client:** And how long do you think, on average, it will take to fill a roll like this?

**Tangerine:** Sure. That really depends on factors on your side as well as on our side. Right? So like I said, we can get you qualified candidates who are interested in your role within the first three to five days of a search. From there, it depends on how quickly and decisively your team acts with those folks, which a lot of times comes down to scheduling availability, making sure that the folks who are engaged in the hiring process on your end are making the search a priority. So that's something that we go over in the intake call and kind of prepare the manager for. Because a search can be wrapped up within as little as two to three weeks, or it can take six weeks or longer. It all depends on how long it takes us to get those interviews scheduled.

**Client:** Yeah. That makes a lot of sense.

**Tangerine:** Are there any other questions that you think the leadership of your team might have, or any other questions that you have that we did not answer?

**Client:** Let's see. Do you guys use any specific tools for your outreaches nowadays?

**Tangerine:** Yeah. We've got a very robust outreach tool set, which does include some AI. It includes some intent data, so knowing who is more likely to be receptive. We've got email and phone contact information. We actually have the members of our team, the human members of our team, make outbound calls to candidates as well. So in this age of increasing AI outreach, a lot of job seekers will tell you that they can't tell when an opportunity is real or if they’re being scammed. They're getting a real phone call from an actual human being to tell them about the opportunity as part of our outreach. We just wrapped up a search where we had a 97% response rate. Now, not every one of those people was interested in the job, but every one of those people did respond and say either that they were interested in setting up a conversation, or they're not on the market right now, or whatever the case was. So between the various channels that we contact candidates, we have a very high response rate, which can also tell you that we have really good contact data for both the folks that are in our network or that come through as referrals or who are sourcing on LinkedIn or on the Internet, or GitHub. in various corners of the Internet we have good data to actually be able to contact those folks directly as well.

**Client:** Gotcha. Gotcha. And then regarding your recruiters, because I know with engineering roles, there is that, technical depth that's needed. Do your recruiters have experience with tech roles, and, you know, how do they really vet the technical aspect?

**Tangerine:** Yes. Absolutely. So a lot of our clients are on the cutting edge of technology. Right? Robotics that are doing, like, surgical procedures, for example. We had some of the first clients who were working on natural language processing for ambient medical scribes, for example. So we do a lot of searches for roles that are highly technical, highly specific, and our team is well-versed in what good looks like for candidates in those roles when someone is a strong candidate. Like when they're maybe an up-and-comer and they have strong fundamentals. And we can also tell when somebody maybe has all the keywords on their resume, but they're not really as strong as they're portraying themselves to be, or maybe they're faking some of their experience. We get all of this information when we screen the person. We do a technical deep dive and get a sense of their abilities in your specific area. And so, again, in that kickoff call is where we really dig deep to understand what we're looking for very specifically that we can get you the right person quickly.

**Client:** Gotcha. Gotcha. Okay. I think that might be all the questions I have on my end.

---

## V. Practical Applications: HR Services Mock Interview Example

#### Intro and Discovery

**Client:** Hi, I haven't met you, but I was recommended to Tangerine Search. I am leading Operations for a company, and we're looking for some help with HR. Someone recommended you to us.

**Tangerine:** Oh, that's terrific. Do you mind my asking who referred me?

**Client:** Yeah. It was our employment attorney who referred us.

**Tangerine:** Oh, wow. That's great. Well, I'm glad you called. So I would have a few questions for you if that's okay, in order to make sure that I know that Tangerine is the best resource for you at this time, depending on what you're struggling with. Does that work for you?

**Client:** Yeah. Thank you.

**Tangerine:** Terrific. So you said that you're with an organization. Would you mind telling me sort of what is that organization? What are you all doing, and what role do you play?

**Client:** Yeah. So I am the Operations Manager. We are a start-up company. We have a little over 50 employees right now.

**Tangerine:** That's terrific.

**Client:** Yeah. We had an HR manager, and it didn't work out. And so now today, I am the operations manager handling the day-to-day HR.

**Tangerine:** Yikes. Okay. So I imagine in your role, you typically wear 17 hats. So, yeah, I applaud you for reaching out for some additional resources until you can right the ship. What stage is the start-up in right now?

**Client:** We are Series B right now.

**Tangerine:** Okay. That's exciting. So when you say that the HR Manager didn't work out, can you give me a little bit more info on that?

**Client:** I don't know too much because it was before I joined the organization.

**Tangerine:** Gotcha. Understood.

**Client:** I can tell you, though, that we recently acquired another company as well, and so there's some work there to be done

**Tangerine:** Yeah.

**Client:** Because of, integrating and all of that.

**Tangerine:** Yeah. That's a unique challenge.

**Client:** Exactly. Is that something that you can help us with?

**Tangerine:** Absolutely. So I have a lot of M&A experience in my background, and it's something you do learn quite a bit from just being directly exposed to it, you know, particularly if you've guided HR through multiple Mergers and Acquisitions. And, it is one of those things that when it doesn't go well, it takes a long time to unravel, and to course-correct. So, prioritizing everything that goes into getting that sorted. And in my experience, it's a lot of managing expectations of work. I think M&A is the kind of work that involves a lot of folks at a senior level or even for the Board of the company. Do you have a board involved in your company?

**Client:** Yes.

**Tangerine:** In your current scenario, leadership can sometimes have an idea of how long things should take, which can be different than how long it ACTUALLY takes, for example. So that's already one thing that HR will need to guide. And then there's a fair amount of governance and due diligence and compliance. Have you seen that thus far? Have you been asked, for example, reporting requests?

**Client:** I yeah. I'm starting to see some of that now, and I'm not really sure where to get some of that. Some things that are being asked, I don't even know if we've collected that data.

**Tangerine:** Right. And if the data has integrity as well. So, yes, I can I can help with that? So it sounds like the HR manager, sort of owned the bulk of HR. I mean, given 50 employees, that's fairly standard. So if we were ultimately to partner together, I would have more questions for you. I think my key question for you right now is why you reached out today. What is the biggest challenge? What's keeping you up at night given that this work is currently on your plate?

#### Problem Identification and Risk Management

**Client:** Sure. So currently, we have someone that we need to fire.

**Tangerine:** Yeah.

**Client:** I mean, this is the most urgent, I would say, the most immediate.

**Tangerine:** Yeah. Sure.

**Client:** We do know that there are some areas of risk. I've heard from other members of leadership here that they're aware of the risk and they want to navigate it.

**Tangerine:** Yeah.

**Client:** We're just not really sure what those areas are. They did have to apparently let someone go before I joined, and they ended up having to pay that person off later on.

**Tangerine:** I understand

**Client:** So I think there's maybe a lack of good processes around termination, maybe not good knowledge and understanding of how that works.

**Tangerine:** That's well put. Sounds like you've picked up on the right things.

**Client:** yeah.

**Tangerine:** So the good news when it comes to exiting employees is that there IS a method for it. There is a case-by-case element just given, like, the nature of hiring and firing, but there is a way to do it. And I can absolutely help you with that. It's something that is quite often an aspect of this work with our clients. And, we pride ourselves on helping candidates navigate that well and honestly just really saving clients a considerable amount of money as a result. And, in relation to what maybe they've had to pay out in the past. So that's gratifying. But like I said, there's a way there's a way to do it correctly. There are best practices. I can help you to build out that standard and reduce risk for your organization, both for this current termination and future cases. This will go a long way towards, helping your leaders and someone in a role like yours have greater peace of mind, but also just plain and simple help to concretely mitigate risk.

#### Service Model and Pricing

**Client:** Great. Okay. Wonderful. That that all sounds really good. How does this work? Because obviously, I understand having an HR person on our team, but how does it work when you're supporting multiple clients? How do you prioritize?

**Tangerine:** Yeah. Totally understand. It's a crucial question. So, first things first, it depends on the nature of the work. There is the strategic, structural, systems work, and then there's tactical day-to-day work. We can help you do both. We have team members who can support the work in an instance where you really just need an HR OPS person or an HR manager. Everyone calls it something different these days; the title can vary.

**Client:** Ok

**Tangerine:** You can use this resource on a limited capacity, for example, around ten hours each week, in order to handle day-to-day stuff on your plate. I typically come in when we're looking at the whole picture, helping you understand what could be the best possible structure for an HR process. For example, Organizational Design, Performance Management, Benefits, HR Tech etc. I'm not sure what you're using for your HR system or if you have, for example, an Applicant Tracking System on the recruiting side. That's the kinda thing that we would get into, how you're managing recruiting currently, those kinds of things. So, pretty much anything you can think of that's programmatic and ideally either should be in place now or should be in place in the future, we get to plan for that and oversee implementation and rollout. Our service is customized to your business and to your goals and growth trajectory. Everything comes up in HR from "How do I print out my benefits card?" to "I was at the emergency room with my kid, and they declined me" to "I'm a manager, and I have an issue with an employee, and I don't know how to manage it." So it's the full gamut on the day-to-day operational tactical side, and then a lot of hands-on support on the higher level and strategic programmatic side. Our services are billed in one of three ways. One is an hourly rate, just as you may have been used to in the past using a contractor. The second is our subscription model. For a discounted rate, you have a certain number of billable hours per month. We are on call, on standby, it's already built into your budget, and you know you're covered. Some clients need a lot of hours at first just to get the right practices and programs in place. Third is the project model. So, let's say you need a handbook in the first place, or you need a handbook updated. We would do an intake, to get very clear on what you need and likely how much time it'll take and then we'll give you a quote and so that everybody's aligned up front on the cost of the project. The last thing I'll mention is that either from the retainer side or from the hourly rate side is that we offer a real advantage to our clients for when things come up with urgency attached, having it be something that can take over your whole day, if not more. And sometimes, for example, it even can evolve into an employment attorney, you know, that sort of thing. In those cases, you have a huge advantage because someone from Tangerine is on call. So our clients will call or email even late at night or very early in the morning. And then, as soon as schedules can align, we get on a call so I can understand what's happening and guide you.

**Client:** Oh, wow. Okay.

**Tangerine:** Yeah. One of the things that Tangerine is most proud of is that you're paying for what you need. Our service it isn't a playbook. It isn't a set system in a box.

**Client:** Got it.

**Tangerine:** You're paying for what you need, and you're paying correctly as that need changes, whether you're scaling up or scaling down.

**Client:** Oh, yeah. That's wonderful. I'm glad you mentioned the employee handbook because you must have read my mind. We definitely need to get one of those in place. One other thing, on the pricing model: are most of your clients on the subscription rate? Is it mostly projects? What do you find that your team does most?

**Tangerine:** Yeah. It's a good question. I'd say that for most of our clients, it's a combination of project work. I'll give you an example. So, throughout the handbook revision, we might learn that we need to switch out what we're using for HR tech and get more aligned with finance. We need to have a dashboard that can allow us to be agile with leadership, with the board. It's classic program work. We need to tackle performance review and feedback loops, and how we manage that. All the the different aspects in HR that really drive employee experience, and how that helps you manage it.

#### Expertise and Expansion

**Client:** Yeah. Okay. Great. Thank you for that. One other thing I wanted to ask you about; we're probably going to be expanding to a new state in terms of both operations and where we have employees based. What is your expertise around employment regulations within the different states in the US?

**Tangerine:** Yeah, that's a terrific question. It's another great example of a classic project. There's a lot more that goes into this than I think people are aware of. And so sort of vending that out, you can hand that off to us and feel secure knowing that it's being done correctly. So there's typically your first line of defense, which is around pay, wage, and hours with payroll. Of course, as you know, registering as a business entity and payroll taxation are some of the basics that you have to do, as well as registering and applying with multiple agencies over time. There's also mandatory reporting state-by-state that can (sadly) be quite dramatically different in individual states. And then, that has an effect on your policies, so your PTO policy, as one example. So in some ways, that goes back to the handbook, and it actually can be good timing to have both at the same time because my clients want a one-size-fits-all series of policies, and that's how you frame your handbook. For others, you can absolutely spell it out. For example, if you reside in California or New York, this is how we're taking care of you in compliance with local law. Take, for example, leaves of absence. I don't know if you're doing leave management, but if you have somebody who's gone out on FMLA or something similar, there's a tremendous amount of compliance-related needs that vary state by state. So, again, just an example. And I have been an in-house CHRO for very large global organizations and also for a number of small start ups where we went from, 15, 25, in one case, 50 people to, 250 or 500 and where we built out in not only in other states, but ultimately in other countries as well. And we did that with an HR team of of 1 or 2. And so it's helped me be quite familiar with the opportunities and challenges that can arise and and just getting your ducks all in a row so that you don't have to worry about any of that stuff, which allows you to just take care of those employees, and allow them to get to work.

**Client:** Yeah. That's great. Because we are interested in growing and, luckily, not immediately, but within probably a year or year and a half, we're gonna look at raising that Series C funidng.

**Tangerine:** Yeah.

**Client:** So I wanted to understand a couple things about just your experience within growing startups for one, but also, could you be there to help me with having those conversations with our CEO or with the board? Do you ever present to the board or meet with those folks directly, or would you only be working with me? How does that work?

**Tangerine:** Yeah. So I absolutely can. And between all of my in-house years with tech startups (which was something like 15 years where I was the HR exec) I was presenting to my peers and my CEO founder as well as to boards regularly. But also as a consultant, I have a client right now where that's part of the work we're doing, helping to build out those slide decks, giving input, and presenting to the board.

**Client:** Nice.

**Tangerine:** A lot of times, the important thing is framing those in a way that the board cares about, what they want to or need to see. And then I also help with the presentation piece, which can be me presenting or sometimes that's me co-presenting with the key stakeholders at the client organization.

**Client:** Right. Okay. Thank you for all of this information. It's really helpful to get a good sense.

**Tangerine:** I'm so glad.

**Client:** What would you say is outside of your scope? Like, what things might come up that we would need outside help for?

**Tangerine:** Yeah. It's a good question. The two that that are the most glaringly obvious and also the most common are, firstly, when when I am gathering the facts about a situation, there can be situations, particularly on the employee relations side, that there really is a need for an employment attorney. And it sounds like you might have a good employment attorney or at least know of a good one based on the referral, which is terrific. There are sometimes situations where I recommend we bring in an employment attorney, and then I often partner with them. Does that make sense? Because I can give them nuance and context, that perhaps others internally just wouldn't know to give.

**Client:** Yeah makes sense.

**Tangerine:** And, we can partner from a project management perspective as needed to get from step one to, say, step five in in that process and get you taken care of faster, which also means more cost-effectiveness. The other instance that comes to mind is compensation architecture, which gets called a lot of different things. This is where we're creating concrete job levels and perhaps salary ranges that accompany them. This goes hand in hand with organizational design. And, essentially it's org charts based on the, the departments, but also it helps you plan and scale.

**Client:** Okay.

**Tangerine:** And people, particularly as you grow and if you have fast growth, have this in place before you suddenly need to double the organization size in a year or two years, which is fairly common with startups that are in a growth stage like yours. If you have this in place beforehand, it just saves you so much anguish and time. So, that kind of work where somebody's really diving in on the comp structure, I might recommend buying data from the kinds of organizations that set the standards. So, I don't know if you've heard of Radford, which is now owned by a company called Ian or Mercer, those kinds of orgs. And I can help you navigate on who would be the best partner for you. I can provide the partner, meaning that you could access Tangerine's subscription to have the cost all under one invoice. Or if we want to use an actual vendor, as I mentioned, I can help you understand what you really need and mitigate costs and drive it so that the process doesn't take longer than it should.

**Client:** Okay.

**Tangerine:** So those are one of the two few examples that I can think of, but hopefully they're helpful examples.

#### Technology, Value, and Closing

**Client:** Okay. Great. And in terms of tools, technology, and systems, it sounds like you've put some of those in place, which might be helpful for us because I inherited a lot of spreadsheets.

**Tangerine:** Oh, yeah. The infamous spreadsheets. I've definitely walked into many scenarios both-in house and as a consultant where sometimes the spreadsheet system actually works. If you're really early stage and small, you don't necessarily need a tool or tooling. But I have to say at 50, particularly when you creep into that, 75 employees to a 125 employees stage, it would greatly behoove you for many reasons to go with an HR system.

**Client:** Got it.

**Tangerine:** You can really up your game, both for operations and data. Having these systems in place can also help to make you more sellable, for example if you're looking to go public or some other kind of liquidity event.

**Client:** Right.

**Tangerine:** Just in terms of your ability, like we mentioned the reporting, to access data that has integrity and pull it and be able to curate it, based on what leadership wants to see and have visibility into. That's going to make you way more efficient. It is going to create a better employee experience, and it's definitely going to create a better experience for your leadership and your board.

**Client:** Okay. Great. And just to make sure that I'm right, you could help us with implementing a new ATS or HR software or upgrading to a new system and migrate off of a legacy system?

**Tangerine:** Yeah. It's just around figuring out what's the best tooling for you, both right at this time and as you scale. And it's one of the things I love about the work is that it's future forward.

**Client:** okay. Right.

**Tangerine:** So we're taking into account not just where you are now, but what your needs are gonna be in the future. And, yes, we can absolutely help you both determine that and then help you implement and integrate with other tools. Ideally, it can talk to other systems too. And I've just spent many months doing this work with two clients where that's been it's been a priority, and as a matter of fact, it’s been quite successful. This work is transformative, both for the folks internally using the new systems, and for the operation of the whole organization.

**Client:** Wow. Okay. Great. And you have experience also with learning management, the LMS systems?

**Tangerine:** Yes we do. We just recently did an implementation of an LMS for a client. It's hugely important to their onboarding process. They have a very complicated onboarding process, and part of that is because of they have a lot of compliance needs. They do government work and have a lot of agencies that can audit at any time. They're heavily regulated. And so their LMS tool was extremely important for compliance and visibility. And then, of course, they're using it for all the other typical needs. The implementation made increased efficiency to the point where they went from two L&D team members to just one. They were able to repurpose that other team member for another need, which is great and speaks highly of our client. But just to give you a sense of how these systems can help you, they literally went from needing two full-time people to one.

**Client:** Oh wow that's wonderful. I mean, just from both a cost perspective, but also an efficiency perspective. And the experience of the employees of that company sounds a lot better.

**Tangerine:** Yes, I agree. You do see that particular benefit, and you see it pretty quickly, which is nice. I don't know about you bit I like a solution hits you with that instant gratification.

**Client:** Yeah. Absolutely.

**Tangerine:** So, let's talk next steps. What would be helpful to you? and kind of a bare bones proposal? I can get you a much richer proposal if I can conduct more of a formal intake. But my my question is how can I help you right now in terms of your decision making, and what information can I provide so that we can keep moving this conversation forward? Because it sounds like you have a genuine need and that it will be better for your team to get started sooner than later.

**Client:** Yeah. Thank you. I have two kind of quick last questions, and then I'll take the information to the leadership, and then maybe we can schedule a call from there. So the first one is just how is what you're offering, and what Tangerine does, different from other fractional HR services or other agencies offering HR consulting? Why should we work with you, or why should I tell my boss that we should work with you?

**Tangerine:** Absolutely. My answer to that is partially sort of analytical and partially anecdotal. So the analytical is the fact that we get excellent results for our clients. I have data to support that, which could be helpful if you're pitching your leadership in terms of just removing pain points, helping you prioritize the right thing on the HR side. And as I mentioned, making it as bulletproof as possible and definitely assisting organizations, whether it's the HR tech, whether it's the expansion into new states, or just relaying our niche expertise. And then the anecdotal answer is that I was on your side of the desk for a long time, and I used vendors to do exactly the work that Tangerine does, and I know what didn't work for me. We understand what you're going through because we've been where you are today. We're armed with the knowledge of what didn't work and what did work. Working with us, you are getting the help you need and paying only for what you need in a timely and curated fashion from someone who has done this all before and has all of the learnings from those experiences. I can predict when some things might go south, and I can explain why. And most importantly I can help you not just understand, but execute. We can help you avoid unnecessary challenges.

**Client:** Oh, that's great. We definitely want to avoid as much cost and headache as possible and get things running as smoothly as possible.

**Tangerine:** Right? Exactly.

**Client:** So how much would should I expect to pay based on what I've told you? Even a rough estimate, how much would you expect to charge, and how quickly would we be able to get started with you?

**Tangerine:** Yeah. Well as a matter of fact, we can get started right away. The next step would be for me to do a more formal intake as you can imagine and, you know, really get to the bottom of what you need.

**Client:** Of course.

**Tangerine:** And that would inform pricing as well. But, from what you’ve mentioned, the handbook can run anywhere from $750 to more like $1,500. It depends on how complicated it is. And, also, if we're helping invent it from scratch, that's going to run on the higher end of that that range. For hourly support, the rate is $285 an hour. With the hourly rate, you can rest assured that we've got many tools in our toolkit and just all-around good knowledge that allows me to know the shortest distance between point a and point b. There's a lot of bang for your buck in our pricing, with the efficiency that comes from experience.

**Client:** Well, that's wonderful. That's what we're looking for is that knowledge and expertise where we can set things up the right way the first time and do things in a way that's really gonna help us long term. So it sounds like a good fit, and I just really want to thank you for your time today.

**Tangerine:** No, thank you so much. We're honored at your interest and certainly at the referral. I will send you an email today, and I can also help you fashion a business case if that's if that's useful, and we can schedule an intake call. You're welcome to invite whatever leadership from your org to that call just to really get to the bottom of your needs.

**Client:** Oh, wonderful. That's that's super helpful that I could have the leadership on that call with me because I can say I'm very impressed with you, and it would really help me to to have you there to sort of explain some of these things that you've told me today once I've had the chance to give you more information.

**Tangerine:** Yes. Absolutely. Well, again, it's about making your life easier. You know? So whatever I can do that does that, then that's thats kinda the name of the game.

**Client:** Wonderful. Thank you.

**Tangerine:** So, yeah, I look forward to partnering. It sounds like you all are at an exciting and very pivotal moment, and, you know, that that makes my job much more fun.
"""
# --- end of legacy inline stub ---

# 2. DEFINE THE HEADER HIERARCHY
headers_to_split_on = [
    ("#", "Header 1"),
    ("##", "Header 2"),
    ("###", "Header 3"),
    ("####", "Header 4"),
]

# 3. INITIAL SPLIT (LOGICAL)
markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
md_header_splits = markdown_splitter.split_text(markdown_text)

# 4. DEFINE "DEPARTMENT-AWARE" LOGIC
def enrich_metadata(chunks):
    """
    Iterates through chunks and assigns a 'department' and 'doc_type' 
    based on the headers found in the metadata.
    """
    for chunk in chunks:
        h1 = chunk.metadata.get("Header 1", "")
        h2 = chunk.metadata.get("Header 2", "")
        h3 = chunk.metadata.get("Header 3", "")
        h4 = chunk.metadata.get("Header 4", "")
        
        # Combine headers for keyword search
        full_path = f"{h1} > {h2} > {h3} > {h4}"
        
        # Default Attributes
        department = "General" 
        doc_type = "Informational"

        # --- LOGIC RULES ---
        
        # Rule 1: HR Specifics
        if "HR" in full_path or "Compliance" in full_path or "Retention" in full_path or "Retaining" in full_path:
            department = "HR_Services"
        
        # Rule 2: Recruiting Specifics (Overrides HR if specific keywords found)
        if "Recruiting" in full_path or "Candidate" in full_path or "Hiring Manager" in full_path:
            department = "Recruiting_Services"

        # Rule 3: Blog/Guides
        if "Blog" in full_path or "Playbook" in full_path:
            doc_type = "Guide/Article"
            
        # Rule 4: Transcripts (The Mock Interviews)
        if "Mock Interview" in full_path:
            doc_type = "Sales_Transcript"
            # Specific check for which interview it is
            if "Recruitment" in full_path:
                department = "Recruiting_Services"
            elif "HR Services" in full_path:
                department = "HR_Services"

        # Extract date from H4 blog headers (e.g., "Blog 1: Resume Q&A (January 17, 2024)")
        date_match = re.search(r'\(([A-Z][a-z]+ \d{1,2},? \d{4})\)', h4)
        if date_match:
            chunk.metadata["date"] = date_match.group(1)

        # Apply new metadata
        chunk.metadata["department"] = department
        chunk.metadata["doc_type"] = doc_type

    return chunks

# Apply the logic
enriched_chunks = enrich_metadata(md_header_splits)

# 5. SECONDARY SPLIT (SIZE CONTROL — conditional)
# Transcripts are already split by named semantic sections via #### headers above,
# so only informational/blog chunks that exceed 1000 chars need further splitting.
standard_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ".", " ", ""]
)

final_chunks = []
for chunk in enriched_chunks:
    # Skip secondary split if the chunk is already small enough
    if len(chunk.page_content) <= 1000:
        final_chunks.append(chunk)
        continue
    # Transcripts are pre-split semantically — only apply fallback split to non-transcripts
    if chunk.metadata.get("doc_type") == "Sales_Transcript":
        final_chunks.append(chunk)
    else:
        final_chunks.extend(standard_splitter.split_documents([chunk]))

# 6. OUTPUT RESULTS (to JSON for easy import to vector DB)
output_data = []
for doc in final_chunks:
    output_data.append({
        "content": doc.page_content.strip(),
        "metadata": doc.metadata
    })

# Save to file
with open("tangerine_chunks.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

# Print preview
print(f"✅ Chunked {len(final_chunks)} documents!")
print(json.dumps(output_data[:3], indent=2))