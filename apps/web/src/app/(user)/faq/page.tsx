'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Card } from '@/components/ui';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const FAQ_DATA: FaqSection[] = [
  {
    title: 'For Employers',
    items: [
      {
        question: 'How do I search for training programs on Training Market?',
        answer:
          'Use the Search page to browse programs by category, delivery mode, budget, and location. You can filter by HRD Corp claimable programs, skill type (technical or soft skills), and certification programs. Our AI-powered matching also recommends programs based on your company profile and past training history.',
      },
      {
        question: 'How do I send an enquiry to a training provider?',
        answer:
          'On any program listing page, click the "Send Enquiry" button. Fill in your preferred dates, number of participants, delivery mode, and any specific requirements. The training provider will receive a notification and typically responds within 1-2 business days with a tailored proposal.',
      },
      {
        question: 'What is the Broadcast feature and how does it work?',
        answer:
          'Broadcasts let you post your training needs to all relevant providers at once. Describe what training you need, your budget range, preferred dates, and location. Matching training providers can then submit proposals, allowing you to compare offerings and choose the best fit without contacting each provider individually.',
      },
      {
        question: 'How does HRD Corp claiming work through Training Market?',
        answer:
          'Programs marked as "HRD Corp Claimable" are registered with HRDF/HRD Corp. When you enquire about these programs, the provider will handle the grant application process. You can filter search results to show only claimable programs. The levy claim amount and scheme type are displayed on each program listing.',
      },
      {
        question: 'Can I compare training programs side by side?',
        answer:
          'Yes. While browsing programs, click the compare icon on any program card to add it to your comparison list. Once you have 2-4 programs selected, click "Compare" to see a detailed side-by-side breakdown of pricing, duration, delivery mode, certifications, provider ratings, and more.',
      },
      {
        question: 'How do I manage my team\'s training records?',
        answer:
          'Your Employer Dashboard provides an overview of all enquiries, active training engagements, and past programs. You can track proposal statuses, view upcoming sessions, and maintain a history of all training activities for compliance and reporting purposes.',
      },
      {
        question: 'What payment methods are supported?',
        answer:
          'Payment is arranged directly with the training provider after accepting a proposal. Most providers accept bank transfer, corporate cheque, and online payment. For HRD Corp claimable programs, the provider will guide you through the levy claim process.',
      },
      {
        question: 'How do I know if a training provider is reputable?',
        answer:
          'Each provider has a quality tier badge (Verified, Premium, or Elite) based on their track record, certifications, and client reviews. You can view their profile to see ratings, reviews from other employers, years of experience, and their list of corporate clients and certifications.',
      },
      {
        question: 'Can I request a customized in-house training program?',
        answer:
          'Absolutely. When sending an enquiry or creating a broadcast, select "In-House" as the delivery mode. Describe your specific requirements, and providers will propose customized programs tailored to your organization\'s needs, delivered at your preferred venue or virtually.',
      },
      {
        question: 'Is there a cost to use Training Market as an employer?',
        answer:
          'Training Market is completely free for employers. You can search programs, send enquiries, create broadcasts, and compare providers at no charge. There are no subscription fees or commissions on your end.',
      },
    ],
  },
  {
    title: 'For Training Providers',
    items: [
      {
        question: 'How do I list my training programs on the marketplace?',
        answer:
          'After registering as a Training Provider, go to your Provider Dashboard and click "New Program". Fill in your program details including title, description, objectives, agenda, pricing, and delivery mode. Submit for review, and our team will verify and publish your listing within 1-2 business days.',
      },
      {
        question: 'How do I respond to employer broadcasts?',
        answer:
          'Relevant broadcasts appear in your Provider Dashboard under "Broadcasts". Click on any broadcast to view the employer\'s requirements, then submit a proposal with your recommended program, pricing, available dates, and any customizations. The employer will review all proposals and select the best fit.',
      },
      {
        question: 'What subscription plans are available for training providers?',
        answer:
          'We offer Free, Professional, and Enterprise plans. The Free plan lets you list up to 3 programs. Professional includes unlimited listings, priority placement, analytics, and broadcast alerts. Enterprise adds API access, dedicated account management, and custom branding. Visit the Pricing page for full details.',
      },
      {
        question: 'What are quality tiers and how do I upgrade?',
        answer:
          'Quality tiers (Unverified, Verified, Premium, Elite) reflect your credibility on the platform. To upgrade, complete your provider profile, upload certifications (SSM, MOF, HRD Corp registration), maintain positive client reviews, and demonstrate consistent program delivery. Our team reviews tier upgrades quarterly.',
      },
      {
        question: 'How do I get verified on Training Market?',
        answer:
          'To get Verified status, upload your SSM business registration, provide proof of HRD Corp registration (if applicable), and complete your company profile with at least 3 published programs. Our team will review your documents and typically approve verification within 3-5 business days.',
      },
      {
        question: 'How are programs ranked in search results?',
        answer:
          'Search rankings consider relevance to the query, provider quality tier, program ratings and reviews, engagement metrics, and recency. Verified and higher-tier providers receive a ranking boost. Keeping your program details up to date and maintaining positive reviews will improve your visibility.',
      },
      {
        question: 'Can I offer both public and in-house programs?',
        answer:
          'Yes. When creating a program, set the program type to "Both". You can specify separate pricing for public sessions (per pax) and in-house delivery (per group/day). You can also manage public session schedules with specific dates and venues.',
      },
      {
        question: 'How do I track my program performance?',
        answer:
          'Your Provider Dashboard shows key metrics including program views, enquiry counts, proposal conversion rates, and average ratings. The Analytics section provides insights into which programs are most popular, where your traffic comes from, and how you compare to similar providers.',
      },
      {
        question: 'What happens if I receive a negative review?',
        answer:
          'You can respond publicly to any review to address concerns. If you believe a review violates our guidelines (spam, irrelevant, or abusive), you can flag it for our moderation team. We encourage providers to use feedback constructively to improve their programs and service.',
      },
      {
        question: 'Can I duplicate an existing program to create a similar one?',
        answer:
          'Yes. On your Programs page, click the Duplicate icon next to any program. This creates a draft copy with all the same details, allowing you to make modifications without starting from scratch. The duplicated program will have "Copy of" prepended to its title.',
      },
    ],
  },
  {
    title: 'General',
    items: [
      {
        question: 'How do I create an account on Training Market?',
        answer:
          'Click "Sign Up" on the homepage and choose your account type: Employer (looking for training) or Training Provider (offering training). Fill in your details, verify your email, and complete your profile. The process takes less than 5 minutes.',
      },
      {
        question: 'How do I update my profile or company information?',
        answer:
          'Go to your Dashboard and click on "Profile" in the sidebar. You can update your company name, contact details, logo, description, and other information. Changes to verified details (like company registration) may require re-verification.',
      },
      {
        question: 'How do notifications work?',
        answer:
          'You receive in-app notifications for enquiry responses, new proposals, broadcast matches, program approvals, and other important updates. Email notifications are sent for critical items. You can customize your notification preferences in Settings to control which alerts you receive.',
      },
      {
        question: 'How does Training Market protect my data and privacy?',
        answer:
          'We comply with Malaysia\'s Personal Data Protection Act (PDPA). Your data is encrypted in transit and at rest. We never share your personal information with third parties without consent. Company information shared in enquiries is only visible to the relevant training provider. Review our full Privacy Policy for details.',
      },
      {
        question: 'How do I contact support?',
        answer:
          'You can reach our support team via email at support@trainingmarket.my, through the in-app chat widget (bottom-right corner), or by calling +60 3-XXXX XXXX during business hours (Mon-Fri, 9am-6pm MYT). We typically respond to emails within 24 hours.',
      },
      {
        question: 'Can I use Training Market on my mobile device?',
        answer:
          'Yes. Training Market is fully responsive and works on all modern browsers on smartphones and tablets. You can search programs, send enquiries, manage proposals, and access your dashboard from any device. A dedicated mobile app is coming soon.',
      },
      {
        question: 'What if I forget my password?',
        answer:
          'Click "Forgot Password" on the login page and enter your registered email. You\'ll receive a password reset link within minutes. If you don\'t see the email, check your spam folder or contact support for assistance.',
      },
      {
        question: 'Is Training Market available outside of Malaysia?',
        answer:
          'Currently, Training Market focuses on the Malaysian training market, including programs registered with HRD Corp. However, international training providers who serve the Malaysian market are welcome to list their programs. We plan to expand to other ASEAN countries in the future.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Go to Settings > Account and click "Delete Account". This will permanently remove your profile, listings, and associated data after a 30-day grace period. During this period, you can reactivate by logging in. Contact support if you need immediate deletion.',
      },
      {
        question: 'What browsers are supported?',
        answer:
          'Training Market supports the latest versions of Google Chrome, Mozilla Firefox, Safari, and Microsoft Edge. For the best experience, we recommend keeping your browser up to date. Internet Explorer is not supported.',
      },
    ],
  },
];

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50"
      >
        <span className="text-sm font-medium text-foreground">{item.question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed text-foreground-muted">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredSections = useMemo(() => {
    if (!search.trim()) return FAQ_DATA;
    const q = search.toLowerCase();
    return FAQ_DATA.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q),
      ),
    })).filter((section) => section.items.length > 0);
  }, [search]);

  const totalResults = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
        <p className="mt-2 text-foreground-muted">
          Find answers to common questions about using Training Market
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions..."
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted focus:border-user-primary focus:outline-none focus:ring-1 focus:ring-user-primary"
        />
      </div>

      {search.trim() && (
        <p className="mb-4 text-sm text-foreground-muted">
          {totalResults} result{totalResults !== 1 ? 's' : ''} found
        </p>
      )}

      {filteredSections.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-foreground-muted">No questions match your search.</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-sm text-user-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredSections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-3 text-lg font-semibold text-foreground">{section.title}</h2>
              <Card>
                {section.items.map((item, idx) => {
                  const key = `${section.title}-${idx}`;
                  return (
                    <AccordionItem
                      key={key}
                      item={item}
                      isOpen={openKey === key}
                      onToggle={() => setOpenKey(openKey === key ? null : key)}
                    />
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Contact CTA */}
      <div className="mt-12 rounded-lg border border-border bg-muted/30 p-6 text-center">
        <h3 className="text-base font-semibold text-foreground">Still have questions?</h3>
        <p className="mt-1 text-sm text-foreground-muted">
          Our support team is ready to help you with anything not covered here.
        </p>
        <a
          href="mailto:support@trainingmarket.my"
          className="mt-4 inline-block rounded-lg bg-user-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
