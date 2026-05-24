import { Request, Response } from 'express';
import { prisma } from "../lib/prisma";
import { FollowService } from '../services/follow.service';
import { get } from 'http';

export const followController = {
    followUser: async (req: Request, res: Response) => {
        try {
            const { followingId } = req.params;
            const followerId = req.userId!;
            if (followerId === followingId) {
                return res.status(400).json({ error: "You cannot follow yourself." });
            }
            const isFollowing = await FollowService.isFollowing(followerId, followingId);
            if (isFollowing) {
                return res.status(400).json({ error: "You are already following this user." });
            }
            const follow = await FollowService.followUser(followerId, followingId);
            res.status(201).json(follow);
        } catch (error) {
            console.error("Error following user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    unFollowUser: async (req: Request, res: Response) => {
        try {
            const { followingId } = req.params;
            const followerId = req.userId!;
            if (followerId === followingId) {
                return res.status(400).json({ error: "You cannot unfollow yourself." });
            }
            const isFollowing = await FollowService.isFollowing(followerId, followingId);
            if (!isFollowing) {
                return res.status(400).json({ error: "You are not following this user." });
            }
            await FollowService.unFollowUser(followerId, followingId);
            res.status(204).send();
        }   
        catch (error) {
            console.error("Error unfollowing user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
        },
    getMyFollowings: async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const followings = await FollowService.getMyFollowings(userId);
            res.status(200).json(followings);
        } catch (error) {
            console.error("Error getting followings:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    getMyFollowers: async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const followers = await FollowService.getMyFollowers(userId);
            res.status(200).json(followers);
        } catch (error) {
            console.error("Error getting followers:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    isFollowing: async (req: Request, res: Response) => {
        try {
            const { followingId } = req.params;
            const followerId = req.userId!;
            const isFollowing = await FollowService.isFollowing(followerId, followingId);
            res.status(200).json({ isFollowing });
        } catch (error) {
            console.error("Error checking follow status:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}