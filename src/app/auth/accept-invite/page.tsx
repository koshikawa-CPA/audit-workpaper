'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BookOpen, Eye, EyeOff, CheckCircle } from 'lucide-react'

type Step = 'loading' | 'form' | 'success' | 'error'

export default function AcceptInvitePage() {
  const [step, setStep] = useState<Step>('loading')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // URL フラグメントから Supabase の認証トークンを取得
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (type === 'invite' && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setErrorMessage('招待リンクが無効または期限切れです。管理者に再招待を依頼してください。')
          setStep('error')
          return
        }
        // URL フラグメントをクリア
        window.history.replaceState(null, '', window.location.pathname)
        setStep('form')
        return
      }

      // フラグメントがない場合: 既にセッションがあれば dashboard へ
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        // 既にプロフィール設定済みかチェック
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single()

        // full_name がメールの@前のデフォルト値の場合はフォーム表示
        const defaultName = session.user.email?.split('@')[0] ?? ''
        if (profile?.full_name && profile.full_name !== defaultName) {
          router.replace('/dashboard')
          return
        }
        setStep('form')
        return
      }

      setErrorMessage('招待リンクが見つかりません。メール内のリンクから再度アクセスしてください。')
      setStep('error')
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setErrorMessage('氏名を入力してください')
      return
    }
    if (password.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください')
      return
    }
    if (password !== passwordConfirm) {
      setErrorMessage('パスワードが一致しません')
      return
    }
    setErrorMessage(null)
    setLoading(true)

    try {
      // パスワードを設定
      const { error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError) throw pwError

      // プロフィールを確定 (氏名 + 招待ロール)
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setStep('success')
      setTimeout(() => router.replace('/dashboard'), 2000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">電子調書管理システム</h1>
          <p className="text-gray-500 mt-1">アカウント登録</p>
        </div>

        <Card padding="lg" className="shadow-xl border-0">
          {step === 'loading' && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
              招待情報を確認中...
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4">
              <div className="text-red-500 mb-4">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="font-medium">招待リンクエラー</p>
              </div>
              <p className="text-sm text-gray-600">{errorMessage}</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium text-gray-900">登録が完了しました</p>
              <p className="text-sm text-gray-500 mt-1">ダッシュボードへ移動します...</p>
            </div>
          )}

          {step === 'form' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                アカウント登録
              </h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                氏名とパスワードを設定してください
              </p>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="氏名"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="山田 太郎"
                  required
                  autoComplete="name"
                />

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    パスワード<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">6文字以上</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    パスワード（確認）<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  登録する
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
