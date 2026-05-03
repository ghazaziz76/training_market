-- Cybersecurity Awareness for Business (2 days)
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Introduction to Cybersecurity Landscape","is_break":false},
    {"module_title":"Common Cyber Threats and Attack Vectors","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Phishing Attack Recognition Workshop","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Password Security and Multi-Factor Authentication","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Hands-On: Simulated Phishing Exercise","is_break":false}
  ]},
  {"day":2,"slots":[
    {"module_title":"Data Handling and Classification","is_break":false},
    {"module_title":"Secure Email and Communication Practices","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Incident Response Procedures","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Social Engineering Defense Strategies","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Assessment and Action Plan Development","is_break":false}
  ]}
]'::jsonb WHERE program_id = '232eb6ee-d2e9-46a5-b88c-c0e0acbc37e0';

-- Digital Marketing: Social Media Strategy (3 days)
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Social Media Marketing Fundamentals","is_break":false},
    {"module_title":"Understanding Platform Algorithms","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Facebook & Instagram Strategy","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Content Creation for Social Media","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Workshop: Creating Your Content Calendar","is_break":false}
  ]},
  {"day":2,"slots":[
    {"module_title":"LinkedIn for B2B Marketing","is_break":false},
    {"module_title":"TikTok and Short-Form Video Strategy","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Paid Social Media Advertising","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Ad Targeting and Budget Optimization","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Hands-On: Setting Up Ad Campaigns","is_break":false}
  ]},
  {"day":3,"slots":[
    {"module_title":"Social Media Analytics and KPIs","is_break":false},
    {"module_title":"ROI Measurement and Reporting","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Community Management and Engagement","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Crisis Management on Social Media","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Final Project: Complete Social Media Plan","is_break":false}
  ]}
]'::jsonb WHERE program_id = 'a511f24a-4afc-4175-a9e6-3c69d612cc3a';

-- ISO 9001:2015 Quality Management System (3 days)
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Introduction to Quality Management Systems","is_break":false},
    {"module_title":"ISO 9001:2015 Structure and Key Changes","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Context of the Organization (Clause 4)","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Leadership and Planning (Clauses 5-6)","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Risk-Based Thinking Workshop","is_break":false}
  ]},
  {"day":2,"slots":[
    {"module_title":"Support and Operation (Clauses 7-8)","is_break":false},
    {"module_title":"Document Control and Record Management","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Process Mapping and Process Approach","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Performance Evaluation (Clause 9)","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Case Study: Malaysian Manufacturing QMS","is_break":false}
  ]},
  {"day":3,"slots":[
    {"module_title":"Improvement and Nonconformity (Clause 10)","is_break":false},
    {"module_title":"Internal Audit Planning and Techniques","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Hands-On: Conducting an Internal Audit","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Corrective Action and Continual Improvement","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Assessment and Certification Roadmap","is_break":false}
  ]}
]'::jsonb WHERE program_id = '8b40f075-3c50-4233-b0a0-042e3029258a';

-- Cloud Computing Fundamentals with AWS (4 days)
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Introduction to Cloud Computing Concepts","is_break":false},
    {"module_title":"Cloud Service Models: IaaS, PaaS, SaaS","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"AWS Account Setup and Console Navigation","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"AWS Global Infrastructure and Regions","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Lab: Launching Your First EC2 Instance","is_break":false}
  ]},
  {"day":2,"slots":[
    {"module_title":"Amazon S3: Storage and Object Management","is_break":false},
    {"module_title":"Amazon RDS: Managed Database Services","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Networking: VPC, Subnets, and Security Groups","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Lab: Building a Web Application Stack","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Elastic Load Balancing and Auto Scaling","is_break":false}
  ]},
  {"day":3,"slots":[
    {"module_title":"AWS Lambda and Serverless Computing","is_break":false},
    {"module_title":"API Gateway and Event-Driven Architecture","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"IAM: Identity and Access Management","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Cloud Security Best Practices","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Lab: Serverless Application Deployment","is_break":false}
  ]},
  {"day":4,"slots":[
    {"module_title":"CloudWatch Monitoring and Logging","is_break":false},
    {"module_title":"Cost Management and Billing Optimization","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Infrastructure as Code with CloudFormation","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Final Project: Deploy Complete Cloud Application","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Assessment and AWS Certification Guidance","is_break":false}
  ]}
]'::jsonb WHERE program_id = 'e4dbac5f-310b-4425-8c17-ed395463e978';

-- Performance Management and KPI Development (2 days)
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Performance Management Framework Overview","is_break":false},
    {"module_title":"Goal Setting: OKRs vs SMART Goals","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Designing KPIs Aligned to Business Strategy","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Workshop: Building KPI Scorecards","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Effective Performance Conversations","is_break":false}
  ]},
  {"day":2,"slots":[
    {"module_title":"Continuous Feedback and Coaching Techniques","is_break":false},
    {"module_title":"Managing Underperformance Constructively","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Malaysian Labour Law Considerations","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Using Data and Analytics for Performance","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Role-Play: Performance Review Simulation","is_break":false}
  ]}
]'::jsonb WHERE program_id = '199dd13e-5284-422f-9209-6be9c5229533';

-- Content Marketing Strategy and Execution (2 days)
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Content Marketing Strategy Foundations","is_break":false},
    {"module_title":"Audience Research and Persona Development","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"SEO Fundamentals for Content Writers","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Blog Writing and SEO-Optimized Content","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Workshop: Writing Your First SEO Article","is_break":false}
  ]},
  {"day":2,"slots":[
    {"module_title":"Email Marketing and Newsletter Strategy","is_break":false},
    {"module_title":"Video Content and Visual Storytelling","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Editorial Calendar Planning","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Content Performance Measurement and ROI","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Final Project: 90-Day Content Marketing Plan","is_break":false}
  ]}
]'::jsonb WHERE program_id = '1a541596-d148-4b1e-a2b5-13543ba08752';

-- Fire Safety and Emergency Response Planning (1 day)
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Fire Safety Regulations in Malaysia","is_break":false},
    {"module_title":"Fire Hazard Identification and Prevention","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Fire Extinguisher Types and Operation","is_break":false},
    {"module_title":"Practical: Fire Extinguisher Drill","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Emergency Evacuation Planning","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Practical: Emergency Evacuation Drill","is_break":false},
    {"module_title":"First Aid for Burns and Assessment","is_break":false}
  ]}
]'::jsonb WHERE program_id = '9b973965-fab2-4c39-be3e-d8f0ca756feb';

-- CRM Strategy and Customer Experience Excellence (2 days)
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Understanding CRM and Customer Experience","is_break":false},
    {"module_title":"Customer Journey Mapping","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"CRM System Selection and Implementation","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Data-Driven Customer Personalization","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Workshop: Mapping Your Customer Journey","is_break":false}
  ]},
  {"day":2,"slots":[
    {"module_title":"Customer Complaint Handling Framework","is_break":false},
    {"module_title":"Service Recovery and Retention Strategies","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Building a Customer-Centric Culture","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Measuring Customer Satisfaction (NPS, CSAT)","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Role-Play: Customer Interaction Scenarios","is_break":false}
  ]}
]'::jsonb WHERE program_id = '88b55926-2985-42c5-97b8-10a089f9343f';

-- Also add agenda to original 5 programs
UPDATE training_programs SET agenda = '[
  {"day":1,"slots":[
    {"module_title":"Leadership Self-Assessment","is_break":false},
    {"module_title":"Strategic Thinking Frameworks","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Vision Setting and Strategic Alignment","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Decision Making Under Uncertainty","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Workshop: Developing Your Leadership Vision","is_break":false}
  ]},
  {"day":2,"slots":[
    {"module_title":"Leading High-Performance Teams","is_break":false},
    {"module_title":"Emotional Intelligence for Leaders","is_break":false},
    {"module_title":"Morning Tea Break","is_break":true},
    {"module_title":"Influencing and Stakeholder Management","is_break":false},
    {"module_title":"Lunch Break","is_break":true},
    {"module_title":"Change Leadership and Transformation","is_break":false},
    {"module_title":"Afternoon Tea Break","is_break":true},
    {"module_title":"Case Study: Leadership in Crisis","is_break":false}
  ]}
]'::jsonb WHERE title = 'Advanced Strategic Leadership Masterclass';
