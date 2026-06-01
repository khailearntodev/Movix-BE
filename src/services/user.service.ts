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
      preferences: true,
      status: true,
      xp: true,
      total_watch_time: true,
      is_flagged: true,
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

  const preferences = (user.preferences as Prisma.JsonObject) || {};
  const gender = preferences?.gender || null;
  const displayNameColor = preferences?.display_name_color || null;

  return {
    ...user,
    role: user.role?.name,
    gender: gender,
    display_name_color: displayNameColor,
  };
};

export const updateProfile = async (
  userId: string,
  data: {
    display_name?: string;
    gender?: string;
    avatar_url?: string;
    display_name_color?: string;
  },
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

  if (data.gender || data.display_name_color) {
    dataToUpdate.preferences = {
      ...currentPreferences,
      ...(data.gender ? { gender: data.gender } : {}),
      ...(data.display_name_color
        ? { display_name_color: data.display_name_color }
        : {}),
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
  const updatedDisplayNameColor = updatedPrefs?.display_name_color || null;

  return {
    ...updatedUser,
    gender: updatedGender,
    display_name_color: updatedDisplayNameColor,
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
export const getUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}
export const getOnboardingData = async () => {
  const genres = await prisma.genre.findMany({
    where: { is_deleted: false },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  const seedMovies = await prisma.movie.findMany({
    where: { is_active: true, is_deleted: false },
    select: {
      id: true,
      title: true,
      original_title: true,
      poster_url: true,
      release_date: true,
      vote_average: true,
    },
    orderBy: [
      { view_count: 'desc' },
      { vote_average: 'desc' },
    ],
    take: 20, 
  });

  const predefined_vibes = [
  "Đen tối",
  "Cảm xúc",
  "Ấm áp",
  "Hoành tráng",
  "Cuốn liên tục",
  "Sâu sắc",
  "Chữa lành",
  "Bí ẩn",
  "Hỗn loạn",
  "Thư giãn",
  "U ám",
  "Phiêu lưu",
  "Lãng mạn",
  "Kỳ quái"
];

const predefined_character_types = [
  "Nhân vật chính thông minh",
  "Phản anh hùng",
  "Nội tâm tổn thương",
  "Nữ chính mạnh mẽ",
  "Nhân vật hài hước",
  "Phản diện cuốn hút",
  "Tình thân gắn kết",
  "Sói độc hành",
  "Nhân vật trưởng thành dần",
  "Thiên tài lập dị",
  "Kẻ yếu vươn lên",
  "Main bá đạo"
];

const predefined_content_to_avoid = [
  "Máu me",
  "Hù dọa",
  "Kết thúc buồn",
  "Mối quan hệ độc hại",
  "Cảnh nhạy cảm",
  "Bạo lực nặng",
  "Tra tấn tâm lý",
  "Động vật chết",
  "Drama quá nhiều",
  "Chính trị"
];
  return { 
    genres, 
    seed_movies: seedMovies,
    predefined_vibes,
    predefined_character_types,
    predefined_content_to_avoid
  };
};

export const saveOnboardingData = async (
  userId: string,
  fav_genres?: string[],
  seed_movie_ids?: string[],
  additional_prefs: {
    vibes?: string[];
    favorite_character_types?: string[];
    exploration_level?: number;
    content_to_avoid?: string[];
  } = {}
) => {
  if (seed_movie_ids && seed_movie_ids.length > 0) {
    const existing = await prisma.movie.count({
      where: { id: { in: seed_movie_ids }, is_active: true, is_deleted: false },
    });
    if (existing !== seed_movie_ids.length) {
      throw new Error('Lỗi khi lưu sở thích: Một số movie ID không hợp lệ.');
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const currentPrefs = (user.preferences as Prisma.JsonObject) || {};
  const updatedPrefs = {
    ...currentPrefs,
    ...(fav_genres && { fav_genres }),
    ...(seed_movie_ids && { seed_movies: seed_movie_ids }),
    ...(additional_prefs.vibes && { vibes: additional_prefs.vibes }),
    ...(additional_prefs.favorite_character_types && { favorite_character_types: additional_prefs.favorite_character_types }),
    ...(additional_prefs.exploration_level !== undefined && { exploration_level: additional_prefs.exploration_level }),
    ...(additional_prefs.content_to_avoid && { content_to_avoid: additional_prefs.content_to_avoid }),
    onboarded_at: new Date().toISOString(),
  };

  await prisma.user.update({
    where: { id: userId },
    data: { preferences: updatedPrefs },
  });

  let summaryParts: string[] = [];
  if (fav_genres && fav_genres.length > 0) {
    const genres = await prisma.genre.findMany({
      where: { id: { in: fav_genres } },
      select: { name: true },
    });
    const genreNames = genres.map((g) => g.name).join(', ');
    summaryParts.push(`Thể loại yêu thích: ${genreNames}`);
  }

  if (additional_prefs.vibes && additional_prefs.vibes.length > 0) {
    summaryParts.push(`Cảm giác/Mood yêu thích: ${additional_prefs.vibes.join(', ')}`);
  }

  if (additional_prefs.favorite_character_types && additional_prefs.favorite_character_types.length > 0) {
    summaryParts.push(`Kiểu nhân vật yêu thích: ${additional_prefs.favorite_character_types.join(', ')}`);
  }

  if (additional_prefs.content_to_avoid && additional_prefs.content_to_avoid.length > 0) {
    summaryParts.push(`Các nội dung muốn tránh: ${additional_prefs.content_to_avoid.join(', ')}`);
  }

  const memorySummary = summaryParts.length > 0 
    ? summaryParts.join('. ') 
    : 'Người dùng chưa cung cấp chi tiết sở thích qua Onboarding.';

  await prisma.userAiMemory.upsert({
    where: { user_id: userId },
    update: {
      summary: memorySummary,
      raw_data: updatedPrefs,
    },
    create: {
      user_id: userId,
      summary: memorySummary,
      raw_data: updatedPrefs,
    },
  });

  return updatedPrefs;
};
