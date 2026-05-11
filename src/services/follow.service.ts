import { get } from 'http';
import { prisma } from '../lib/prisma';

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
        return prisma.userFollow.findMany({
            where: {
                follower_id: useId
            },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        avatar_url: true
                    }
                }
            }
        });
    },
    getMyFollowers: async (useId: string) => {
        return prisma.userFollow.findMany({
            where: {
                following_id: useId
            },
            include: {
                follower: {

                    select: {
                        id: true,
                        username: true,
                        avatar_url: true
                    }
                }
            }
        });
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