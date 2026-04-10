import bcrypt from "bcryptjs"
import { supabase } from "@/lib/supabase"

export async function authenticateUser(email: string, password: string) {
    const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    if (!user) {
        return null
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
        return null
    }

    return user
}

export async function createSession(userId: string) {
    const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data, error } = await supabase
        .from("sessions")
        .insert({
            user_id: userId,
            expires_at: expiresAt,
        })
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}

export async function deleteSession(sessionId: string) {
    const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)

    if (error) {
        throw new Error(error.message)
    }
}

export async function getSessionUser(sessionId?: string) {
    if (!sessionId) return null

    const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("id, user_id, expires_at")
        .eq("id", sessionId)
        .maybeSingle()

    if (sessionError) {
        throw new Error(sessionError.message)
    }

    if (!session) {
        return null
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
        await deleteSession(session.id)
        return null
    }

    const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user_id)
        .maybeSingle()

    if (userError) {
        throw new Error(userError.message)
    }

    return user ?? null
}

export async function getUserById(userId: string) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return data ?? null
}

export async function updateUserProfile(
    userId: string,
    updates: {
        pet_name?: string
        pet_type?: string
        pet_age?: number | null
        description?: string
        avatar_url?: string
    }
) {
    const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", userId)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}

export async function getProfileStats(userId: string) {
    const { count: likedCount, error: likedError } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("to_user_id", userId)

    if (likedError) {
        throw new Error(likedError.message)
    }

    const { count: sentLikeCount, error: sentLikeError } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("from_user_id", userId)

    if (sentLikeError) {
        throw new Error(sentLikeError.message)
    }

    const { count: conversationCount, error: conversationError } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    if (conversationError) {
        throw new Error(conversationError.message)
    }

    return {
        likedCount: likedCount ?? 0,
        sentLikeCount: sentLikeCount ?? 0,
        mutualMatchCount: conversationCount ?? 0,
    }
}

export async function getActiveMembership(userId: string) {
    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("end_at", now)
        .order("created_at", { ascending: false })
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return data ?? null
}