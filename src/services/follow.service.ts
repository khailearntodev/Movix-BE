import { prisma } from '../lib/prisma';

const userSelect = {
    id: true,
    email: true,
    username: true,
    display_name: true,
    avatar_url: true,
    gender: true,
    role: {
        select: {
            name: true
        }
    },
    preferences: true
};

export const FollowService = {
    followUser: async (followerId: string, followingId: string) => {
        return prisma.userFollow.create({
            data: {
                follower_id: followerId,
                following_id: followingId
            }
        });
    },
    unFollowUser: async (followerId: string, followingId: string) => {
        return prisma.userFollow.delete({
            where: {
                follower_id_following_id: {
                    follower_id: followerId,
                    following_id: followingId
                }
            }
        });
    },
    getMyFollowings: async (useId: string) => {
        const followings = await prisma.userFollow.findMany({
            where: {
                follower_id: useId
            },
            include: {
                following: {
                    select: userSelect
                }
            }
        });
        return followings.map((follow) => follow.following);
    },
    getMyFollowers: async (useId: string) => {
        const followers = await prisma.userFollow.findMany({
            where: {
                following_id: useId
            },
            include: {
                follower: {
                    select: userSelect
                }
            }
        });
        return followers.map((follow) => follow.follower);
    },
    isFollowing: async (followerId: string, followingId: string) => {
        const follow = await prisma.userFollow.findUnique({
            where: {
                follower_id_following_id: {
                    follower_id: followerId,
                    following_id: followingId
                }
            }
        });
        return !!follow;
    }
}
