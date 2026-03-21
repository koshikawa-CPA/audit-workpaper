'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      } else {
        if (!fullName.trim()) {
          throw new Error('氏名を入力してください')
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'creator', // Default role; admin can change later
            },
          },
        })
        if (error) throw error
        setSuccess(
          '確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。'
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'エラーが発生しました'
      // Translate common Supabase errors
      if (message.includes('Invalid login credentials')) {
        setError('メールアドレスまたはパスワードが正しくありません')
      } else if (message.includes('Email not confirmed')) {
        setError('メールアドレスの確認が完了していません。確認メールをご確認ください。')
      } else if (message.includes('User already registered')) {
        setError('このメールアドレスは既に登録されています')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card padding="lg" className="shadow-xl border-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
        {mode === 'login' ? 'ログイン' : 'アカウント作成'}
      </h2>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm mb-4">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <Input
            label="氏名"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="山田 太郎"
            required
            autoComplete="name"
          />
        )}

        <Input
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@company.com"
          required
          autoComplete="email"
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            パスワード
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {mode === 'signup' && (
            <p className="text-xs text-gray-500">6文字以上</p>
          )}
        </div>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {mode === 'login' ? (
            <>
              <LogIn className="h-4 w-4" />
              ログイン
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              アカウントを作成
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        {mode === 'login' ? (
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{' '}
            <button
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              新規登録
            </button>
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            既にアカウントをお持ちの方は{' '}
            <button
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ログイン
            </button>
          </p>
        )}
      </div>

      {/* Demo credentials hint */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <p className="text-xs text-blue-700 text-center">
          初回ご利用の方は「新規登録」からアカウントを作成してください
        </p>
      </div>
    </Card>
  )
}
