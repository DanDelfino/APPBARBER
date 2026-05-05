import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname.replace(/^\/barber/, '') || '/'
  const isAuthRoute = pathname.startsWith('/login')

  let user = null
  let authError = null

  try {
    const {
      data: { user: sessionUser },
      error,
    } = await supabase.auth.getUser()

    user = sessionUser
    authError = error
  } catch (error) {
    authError = error
  }

  if (authError && isAuthRoute) {
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) {
        supabaseResponse.cookies.delete(name)
      }
    })
  }

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
