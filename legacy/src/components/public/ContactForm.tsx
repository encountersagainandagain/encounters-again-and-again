'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Check, Send } from 'lucide-react';

const emptyForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

type ContactFormProps = {
  defaultSubject?: string;
  defaultMessage?: string;
  subjectPlaceholder?: string;
  messagePlaceholder?: string;
};

function createEmptyForm(defaultSubject = '', defaultMessage = '') {
  return {
    ...emptyForm,
    subject: defaultSubject,
    message: defaultMessage,
  };
}

export function ContactForm({
  defaultSubject = '',
  defaultMessage = '',
  subjectPlaceholder = "What's this about?",
  messagePlaceholder = 'Tell me about your project...',
}: ContactFormProps = {}) {
  const [formData, setFormData] = useState(() => createEmptyForm(defaultSubject, defaultMessage));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!formData.name || !formData.email || !formData.message) {
      setErrorMessage('Please fill in your name, email, and message.');
      return;
    }

    setIsSubmitting(true);

    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    }).catch(() => null);

    setIsSubmitting(false);

    if (response?.ok) {
      setIsSubmitted(true);
      window.setTimeout(() => {
        setFormData(createEmptyForm(defaultSubject, defaultMessage));
        setIsSubmitted(false);
      }, 3000);
      return;
    }

    const body = await response?.json().catch(() => null);
    setErrorMessage(
      body?.error || 'The message could not be sent. Please email Katie directly.'
    );
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h3 className="font-display text-2xl mb-2">Thank you!</h3>
        <p className="font-body text-black/70">
          I&apos;ll get back to you as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input
        type="text"
        name="website"
        value={formData.website}
        onChange={handleChange}
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-px w-px opacity-0"
        aria-hidden="true"
      />

      <div>
        <label htmlFor="name" className="block font-body text-sm text-black/70 mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-black/10 font-body text-base focus:outline-none focus:border-ocean transition-colors"
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block font-body text-sm text-black/70 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-black/10 font-body text-base focus:outline-none focus:border-ocean transition-colors"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block font-body text-sm text-black/70 mb-2">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white border border-black/10 font-body text-base focus:outline-none focus:border-ocean transition-colors"
          placeholder={subjectPlaceholder}
        />
      </div>

      <div>
        <label htmlFor="message" className="block font-body text-sm text-black/70 mb-2">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={6}
          className="w-full px-4 py-3 bg-white border border-black/10 font-body text-base focus:outline-none focus:border-ocean transition-colors resize-none"
          placeholder={messagePlaceholder}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-ocean w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="w-5 h-5" />
        <span>{isSubmitting ? 'SENDING...' : 'SUBMIT'}</span>
      </button>

      {errorMessage && (
        <p className="flex items-start gap-2 font-body text-sm leading-relaxed text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </form>
  );
}
