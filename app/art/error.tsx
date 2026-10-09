'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="editorial-page editorial-loading"><h1>Art is temporarily unavailable</h1><p>Please try again in a moment.</p><button className="editorial-button" onClick={reset}>Try again</button></section>;}
