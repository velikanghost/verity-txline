import PublicProfileView from "@/components/profile/PublicProfileView"

interface PublicProfilePageProps {
  params: Promise<{
    userId: string
  }>
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { userId } = await params

  return (
    <div className="tournament-public-profile">
      <PublicProfileView userId={userId} />
    </div>
  )
}
