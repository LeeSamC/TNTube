const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type ApiOptions = {
    method?: string
    body?: unknown
    headers?: HeadersInit
}

async function makeRequest(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const headers = new Headers(options.headers)
    if(options.body !== undefined){
        headers.set('Content-type', 'application/json')
    }

    return fetch(
        `${API_URL}${endpoint}`,
        {
            method: options.method || 'GET',
            headers,
            credentials: 'include',
            body: 
                options.body !== undefined
                    ? JSON.stringify(options.body)
                    : undefined
        }
    )
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
    if(refreshPromise){
        return refreshPromise
    }

    refreshPromise = (async () => {
        try{
            const response = await fetch(
                `${API_URL}/auth/refresh`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            )

            return response.ok
        }catch{
            return false
        }finally{
            refreshPromise = null
        }
    })()

    return refreshPromise
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    let response = await makeRequest(endpoint, options)

    const isAuthEndpoint = 
        endpoint === '/auth/login' ||
        endpoint === '/auth/register' ||
        endpoint === '/auth/refresh' ||
        endpoint === '/auth/logout'

    if(response.status === 401 && !isAuthEndpoint){
        const refreshed = await refreshAccessToken()
        if(refreshed){
            response = await makeRequest(
                endpoint, options
            )
        }else{
            throw new Error('Session expired, Please login again')
        }
    }

    let data: any = null

    try{
        data = await response.json()
    }catch {
        data = null
    }

    if(!response.ok){
        throw new Error(data?.message || 'Request failed')
    }

    return data as T
}