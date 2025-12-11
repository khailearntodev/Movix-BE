-- CreateTable
CREATE TABLE "MovieRecommendation" (
    "id" UUID NOT NULL,
    "movie_id" UUID NOT NULL,
    "similar_movies" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovieRecommendation_movie_id_key" ON "MovieRecommendation"("movie_id");

-- AddForeignKey
ALTER TABLE "MovieRecommendation" ADD CONSTRAINT "MovieRecommendation_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
