import { Calendar, Clock, HelpCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const PlaceholderPage = ({ title }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
    <h1 className="text-4xl font-bold font-heading mb-4">{title}</h1>
    <p className="text-zinc-400">This page is coming soon.</p>
  </div>
);

export const About = () => <PlaceholderPage title="About Us" />;

export const Schedule = () => {
  const days = Array.from({ length: 9 }, (_, i) => ({
    day: i + 1,
    date: `${11 + i} October 2026`,
  }));

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto min-h-screen">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">Rangilo Raas 2.0</h1>
        <p className="text-xl text-zinc-400 mb-4">11 October 2026 – 19 October 2026</p>
        <div className="inline-flex items-center justify-center space-x-2 text-red-500 bg-red-500/10 px-6 py-3 rounded-full">
          <Clock size={20} />
          <span className="font-semibold tracking-wide">Event Timing: 6:30 PM – 1:00 AM</span>
        </div>
      </div>

      <div className="space-y-6">
        {days.map((d) => (
          <div key={d.day} className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between border-l-4 border-red-500 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <div className="bg-zinc-800/80 p-3 rounded-xl text-red-400">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold font-heading">Day {d.day}</h3>
                <p className="text-zinc-400">{d.date}</p>
              </div>
            </div>
            <div className="flex items-center text-zinc-300 bg-zinc-800/50 px-4 py-2 rounded-lg whitespace-nowrap">
              <Clock size={16} className="mr-2 text-red-400" />
              6:30 PM – 1:00 AM
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FAQ = () => {
  const faqs = [
    {
      question: "Are food and refreshments available at the event?",
      answer: "Yes, food and refreshments will be available at the event. However, food and refreshments are not included in the ticket price. Guests can purchase them separately at the venue."
    }
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <div className="inline-flex justify-center items-center p-4 bg-red-500/10 text-red-500 rounded-full mb-6">
          <HelpCircle size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-zinc-400">Everything you need to know about Rangilo Raas 2.0</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <FAQItem key={index} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </div>
  );
};

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-panel overflow-hidden border border-zinc-800 transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
      >
        <span className="font-semibold text-lg">{question}</span>
        <ChevronDown 
          size={20} 
          className={`text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      <div 
        className={`px-6 transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-zinc-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

export const Contact = () => <PlaceholderPage title="Contact Us" />;
