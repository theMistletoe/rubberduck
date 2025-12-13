'use client';

import 'core-js/stable'
import 'regenerator-runtime/runtime'

import Image from 'next/image';
import { useRef, useState } from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Page() {
  const [pageStatus, setPageStatus] = useState<'init'|'listning'|'typing'|'result'>('init')
  const [thinking, setThinking] = useState('');
  const [input, setInput] = useState('');
  const bioRef = useRef<null | HTMLDivElement>(null);

  const {
    transcript,
    listening,
    resetTranscript,
  } = useSpeechRecognition();

  const scrollToBios = () => {
    if (bioRef.current !== null) {
      bioRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStart = () => {
    SpeechRecognition.startListening({
      continuous: true,
      language: 'ja-JP',
    });
    setPageStatus('listning')
  };

  const handleEnd = () => {
    setInput(transcript);
    setThinking(transcript);
    SpeechRecognition.stopListening();
    resetTranscript();
    setPageStatus('typing')
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setThinking(e.target.value);
  }
  
  const { sendMessage, status, messages } =
    useChat({
      transport: new DefaultChatTransport({
        api: '/api/chat',
      }),
      onFinish() {
        scrollToBios();
      },
    });

  const isLoading = status === 'submitted' || status === 'streaming';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('thinking', thinking);
    sendMessage(
      { text: input },
      { body: { thinking } }
    );
    setPageStatus('result')
  };

  const lastMessage = messages[messages.length - 1];
  // 新APIではmessage.partsからテキストを取得
  const generatedSummery = lastMessage?.role === "assistant" 
    ? lastMessage.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map(part => part.text)
        .join('')
    : null;

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center px-4 mt-12 sm:mt-20 max-w-2xl">
        <Image
          width={200}
          height={200}
          src={'/rubberduck.png'}
          alt={'rubberduck'}
        />
        {pageStatus === 'init' && (
          <>
            <div>
              <p>あなたのモヤモヤ悩んでいることを、とにかく話してみて！</p>
            </div>
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={handleStart}
            >
              考えごとを話してみる
            </button>
          </>
        )}
        {pageStatus === 'listning' && listening && (
          <>
            <p>{transcript || 'あなたが話し始めるのを待っています…'}</p>
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={handleEnd}
              >
              書きおこしを終わる
            </button>
            <div>
              <p className='mt-2 text-small text-gray-400'>※PCの方が音声認識の精度が高いです</p>
            </div>
          </>
        )}
        {pageStatus === 'typing' && (
          <>   
            <form className="w-full" onSubmit={onSubmit}>
              <div className="flex mt-10 items-center space-x-3">
                <p className="text-left font-medium">
                  この内容でOK？
                </p>
              </div>
              <textarea
                value={input}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                placeholder={
                  '考えていることをテキストにかきおこしてみよう！'
                }
                />

              {!isLoading && (
                <button
                className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                type="submit"
                >
                  OK!
                </button>
              )}
              {isLoading && (
                <button
                className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                disabled
                >
                  <span className="loading">
                    <span style={{ backgroundColor: 'white' }} />
                    <span style={{ backgroundColor: 'white' }} />
                    <span style={{ backgroundColor: 'white' }} />
                  </span>
                </button>
              )}
            </form>
          </>
        )}
        {pageStatus === 'result' && (
          <output className="space-y-10 my-10">
            {generatedSummery ? (
              <>
                <div>
                  <h2
                    className="text-center text-slate-900 mx-auto"
                    ref={bioRef}
                    >
                    あなたの考えを整理してみたよ！
                  </h2>
                </div>
                <div className="space-y-8 flex flex-col items-center justify-center max-w-xl mx-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className='markdown'>{generatedSummery}</ReactMarkdown>
                </div>
              </>
            ) : <p>うーん…ちょっとまってね…</p>}
          </output>
        )}
      </main>
      <Footer />
    </div>
  );
}
