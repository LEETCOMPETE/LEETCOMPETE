'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function ProblemRedirectPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    const problemId = Array.isArray(id) ? id[0] : id;
    api.getProblem(problemId)
      .then((prob) => {
        if (prob && prob.contest_id) {
          router.replace(`/contests/${prob.contest_id}/problems/${problemId}`);
        } else {
          router.replace('/problems');
        }
      })
      .catch((err) => {
        console.error('Failed to fetch problem detail:', err);
        router.replace('/problems');
      });
  }, [id, router]);

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse bg-slate-900/50 rounded-xl border border-slate-800">
        Loading problem environment...
      </div>
    </div>
  );
}
