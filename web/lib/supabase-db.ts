import { supabase } from "@/lib/supabase"

export type UserProfileUpdateInput = {
    username?: string | null
    pet_name?: string | null
    pet_type?: string | null
    pet_age?: number | null
    description?: string | null
    avatar_url?: string | null
}

/* =============================
   Session
============================= */

export async function createSession(sessionId: string, userId: string) {
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error } = await supabase.from("sessions").insert({
        id: sessionId,
        user_id: userId,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
    })

    if (error) {
        return {
            success: false,
            error: error.message,
        }
    }

    return {
        success: true,
    }
}

export async function getSessionUser(sessionId?: string) {
    if (!sessionId) return null

    const now = new Date().toISOString()

    const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("user_id, expires_at")
        .eq("id", sessionId)
        .gt("expires_at", now)
        .maybeSingle()

    if (sessionError || !session) {
        return null
    }

    const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user_id)
        .maybeSingle()

    if (userError || !user) {
        return null
    }

    return user
}

export async function deleteSession(sessionId?: string) {
    if (!sessionId) {
        return {
            success: false,
            error: "No session id",
        }
    }

    const { error } = await supabase.from("sessions").delete().eq("id", sessionId)

    if (error) {
        return {
            success: false,
            error: error.message,
        }
    }

    return {
        success: true,
    }
}

/* =============================
   Users
============================= */

export async function getUserById(userId: string) {
    if (!userId) return null

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

    if (error || !data) {
        return null
    }

    return data
}

export async function getAllUsers() {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return data || []
}

export async function getAllOtherUsers(currentUserId: string) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .neq("id", currentUserId)
        .order("created_at", { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return data || []
}

/* =============================
   User Profile
============================= */

export async function updateUserProfile(
    userId: string,
    updates: UserProfileUpdateInput
) {
    const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    }

    if (updates.username !== undefined) payload.username = updates.username
    if (updates.pet_name !== undefined) payload.pet_name = updates.pet_name
    if (updates.pet_type !== undefined) payload.pet_type = updates.pet_type
    if (updates.pet_age !== undefined) payload.pet_age = updates.pet_age
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url

    const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", userId)
        .select("*")
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    if (!data) {
        throw new Error("Failed to update user profile")
    }

    return data
}

/* =============================
   Chat / Conversations
============================= */

export async function getUserConversations(userId: string) {
    const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("created_at", { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return data || []
}

export async function getOrCreateConversation(
    currentUserId: string,
    targetUserId: string
) {
    if (!currentUserId || !targetUserId) {
        throw new Error("Both user IDs are required")
    }

    if (currentUserId === targetUserId) {
        throw new Error("You cannot create a conversation with yourself")
    }

    const user1Id = currentUserId < targetUserId ? currentUserId : targetUserId
    const user2Id = currentUserId < targetUserId ? targetUserId : currentUserId

    const { data: existingConversation, error: findError } = await supabase
        .from("conversations")
        .select("*")
        .eq("user1_id", user1Id)
        .eq("user2_id", user2Id)
        .maybeSingle()

    if (findError) {
        throw new Error(findError.message)
    }

    if (existingConversation) {
        return existingConversation
    }

    const now = new Date().toISOString()

    const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
            user1_id: user1Id,
            user2_id: user2Id,
            created_at: now,
        })
        .select("*")
        .maybeSingle()

    if (createError) {
        throw new Error(createError.message)
    }

    if (!newConversation) {
        throw new Error("Failed to create conversation")
    }

    return newConversation
}

/* =============================
   Likes
============================= */

export async function hasLiked(fromUserId: string, toUserId: string) {
    if (!fromUserId || !toUserId) {
        return false
    }

    const { data, error } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", fromUserId)
        .eq("to_user_id", toUserId)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return !!data
}

export async function createLike(fromUserId: string, toUserId: string) {
    if (!fromUserId || !toUserId) {
        throw new Error("Both user IDs are required")
    }

    if (fromUserId === toUserId) {
        throw new Error("You cannot like yourself")
    }

    const alreadyLiked = await hasLiked(fromUserId, toUserId)

    if (alreadyLiked) {
        return {
            success: false,
            error: "Already liked",
        }
    }

    const { data, error } = await supabase
        .from("likes")
        .insert({
            from_user_id: fromUserId,
            to_user_id: toUserId,
            created_at: new Date().toISOString(),
        })
        .select("*")
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return {
        success: true,
        like: data,
    }
}

export async function getLikesSentByUser(userId: string) {
    const { data, error } = await supabase
        .from("likes")
        .select("*")
        .eq("from_user_id", userId)
        .order("created_at", { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return data || []
}

export async function getLikesReceivedByUser(userId: string) {
    const { data, error } = await supabase
        .from("likes")
        .select("*")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return data || []
}

/* =============================
   Membership
============================= */

export async function getActiveMembership(userId: string) {
    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .or(`end_at.is.null,end_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return data
}

export async function activateMembership(
    userId: string,
    days: number,
    plan: "monthly" | "yearly" = "monthly"
) {
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + days)

    const existingMembership = await getActiveMembership(userId)

    if (existingMembership) {
        const { data, error } = await supabase
            .from("memberships")
            .update({
                plan_type: plan,
                status: "active",
                start_at: now.toISOString(),
                end_at: endDate.toISOString(),
            })
            .eq("id", existingMembership.id)
            .select("*")
            .maybeSingle()

        if (error) {
            throw new Error(error.message)
        }

        return data
    }

    const { data, error } = await supabase
        .from("memberships")
        .insert({
            user_id: userId,
            plan_type: plan,
            status: "active",
            start_at: now.toISOString(),
            end_at: endDate.toISOString(),
        })
        .select("*")
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return data
}

export async function cancelActiveMembership(userId: string) {
    const { data, error } = await supabase
        .from("memberships")
        .update({
            status: "cancelled",
        })
        .eq("user_id", userId)
        .eq("status", "active")
        .select("*")

    if (error) {
        throw new Error(error.message)
    }

    if (!data || data.length === 0) {
        return {
            success: false,
            error: "No active membership found",
        }
    }

    return {
        success: true,
    }
}

export async function getLikeQuota(userId: string) {
    const membership = await getActiveMembership(userId)

    if (membership) {
        return {
            isMember: true,
            planType: membership.plan_type,
            dailyLimit: -1,
            remaining: -1,
            unlocked: true,
        }
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("from_user_id", userId)
        .gte("created_at", todayStart.toISOString())

    if (error) {
        throw new Error(error.message)
    }

    const dailyLimit = 20
    const used = count ?? 0
    const remaining = Math.max(0, dailyLimit - used)

    return {
        isMember: false,
        planType: null,
        dailyLimit,
        remaining,
        unlocked: false,
    }
}

/* =============================
   Messages / Conversation Access
============================= */

export async function getConversationById(conversationId: string) {
    if (!conversationId) return null

    const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle()

    if (error || !data) {
        return null
    }

    return data
}

export async function getConversationMessages(conversationId: string) {
    if (!conversationId) return []

    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return data || []
}

export async function createMessage(
    conversationId: string,
    senderId: string,
    content: string
) {
    const { data, error } = await supabase
        .from("messages")
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content,
            created_at: new Date().toISOString(),
        })
        .select("*")
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}

export async function markSingleMessageUsed(
    conversationId: string,
    userId: string
) {
    return {
        success: true,
        conversationId,
        userId,
    }
}

export async function getConversationAccess(
    conversationId: string,
    currentUserId: string
) {
    const conversation = await getConversationById(conversationId)

    if (!conversation) {
        return null
    }

    const otherUserId =
        conversation.user1_id === currentUserId
            ? conversation.user2_id
            : conversation.user2_id === currentUserId
                ? conversation.user1_id
                : null

    if (!otherUserId) {
        return null
    }

    const likedByMe = await hasLiked(currentUserId, otherUserId)
    const likedMe = await hasLiked(otherUserId, currentUserId)
    const isMatch = likedByMe && likedMe

    const { count, error: countError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("sender_id", currentUserId)

    if (countError) {
        throw new Error(countError.message)
    }

    const sentCount = count || 0
    const singleMessageUsedByMe = sentCount >= 1

    const canSendUnlimited = isMatch
    const canSendOneIntroMessage =
        likedByMe && !isMatch && !singleMessageUsedByMe
    const canSendMessage = canSendUnlimited || canSendOneIntroMessage

    return {
        conversation_id: conversationId,
        current_user_id: currentUserId,
        other_user_id: otherUserId,
        liked_by_me: likedByMe,
        liked_me: likedMe,
        is_match: isMatch,
        single_message_used_by_me: singleMessageUsedByMe,
        can_send_unlimited: canSendUnlimited,
        can_send_one_intro_message: canSendOneIntroMessage,
        can_send_message: canSendMessage,
    }
}