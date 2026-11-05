import { api } from "../../libs/api";

export type User = {
    userId: string,
    firstName: string,
    lastName: string,
    username: string,
    createdAt: string
}

export async function registerUser(
    data: {
        firstName: string
        lastName: string
        username: string
        password: string
        confirmPassword: string
    }
){
    return api<{
        message: string
        user: User
    }>('/register', {
        method: 'POST',
        body: data
    })
}

export async function loginUser(
    data: {
        username: string
        password: string
    }
){
    return api<{
        user: User
    }>('/login', {
        method: 'POST',
        body: data
    })
}