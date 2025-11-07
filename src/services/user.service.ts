import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      avatar_url: true,
      preferences: true, //
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const preferences = user.preferences as Prisma.JsonObject;
  const gender = preferences?.gender || null;

  return {
    ...user,
    gender: gender,
  };
};

export const updateProfile = async (
  userId: string,
  data: { display_name?: string; gender?: string; avatar_url?: string },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true, display_name: true, avatar_url: true },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const currentPreferences = (user.preferences as Prisma.JsonObject) || {};
  
  const dataToUpdate: Prisma.UserUpdateInput = {
    display_name: data.display_name || user.display_name,
    avatar_url: data.avatar_url || user.avatar_url,
  };

  if (data.gender) {
    dataToUpdate.preferences = {
      ...currentPreferences,
      gender: data.gender,
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      avatar_url: true,
      preferences: true,
      role: {
        select: { name: true },
      },
    },
  });

  const updatedPrefs = updatedUser.preferences as Prisma.JsonObject;
  const updatedGender = updatedPrefs?.gender || null;

  return {
    ...updatedUser,
    gender: updatedGender,
  };
};
export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    throw new Error('INVALID_OLD_PASSWORD');
  }
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword },
  });

  return true;
};