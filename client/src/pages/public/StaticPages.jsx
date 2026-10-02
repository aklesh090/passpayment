const PlaceholderPage = ({ title }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
    <h1 className="text-4xl font-bold font-heading mb-4">{title}</h1>
    <p className="text-zinc-400">This page is coming soon.</p>
  </div>
);

export const About = () => <PlaceholderPage title="About Us" />;
export const Schedule = () => <PlaceholderPage title="Event Schedule" />;
export const FAQ = () => <PlaceholderPage title="Frequently Asked Questions" />;
export const Contact = () => <PlaceholderPage title="Contact Us" />;
