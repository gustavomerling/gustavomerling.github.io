import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Music,
  Play,
  Repeat,
  Sparkles,
} from 'lucide-react'
import BrandIcon from '@/components/ui/BrandIcon'
import { ALBUMS } from '@/lib/albums'
import { getMember, MEMBERS, albumImage, type MemberProfile, type MemberPost } from '@/lib/members'

function MemberAvatar({ member, size }: { member: MemberProfile; size: string }) {
  return (
    <img
      src={member.avatar}
      alt={`Foto de ${member.name}`}
      loading="lazy"
      className={`${size} rounded-full object-cover object-top`}
    />
  )
}

function PostRelative({ post, member }: { post: MemberPost; member: MemberProfile }) {
  const album = post.albumId ? ALBUMS.find((a) => a.id === post.albumId) : undefined

  return (
    <article className="rounded-xl border border-line-1 bg-surface-1 p-4">
      <div className="flex items-center gap-3">
        <MemberAvatar member={member} size="size-10" />
        <div>
          <p className="text-sm font-semibold text-content-primary">
            {member.name}{' '}
            <span className="ml-1 font-normal text-content-muted">
              {member.handle} · {post.time}
            </span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-content-secondary whitespace-pre-line">
        {post.text}
      </p>
      {post.tag && (
        <p className="mt-2 text-sm font-semibold text-accent">{post.tag}</p>
      )}

      {post.kind === 'música' && (
        <div className="relative mt-4 overflow-hidden rounded-lg border border-line-1">
          {album ? (
            <img
              src={albumImage(post.albumId!)}
              alt={`Álbum ${album.name}`}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div
              className={`flex aspect-[16/10] w-full items-center justify-center ${member.coverClass}`}
            >
              <Music className="size-8 text-white/80" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
              <Play className="size-5 fill-current" aria-hidden="true" />
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-xs font-medium text-white">
            {album ? `${member.handle.split(' ')[0]} · ${album.name}` : post.tag}
          </div>
        </div>
      )}

      {post.kind === 'foto' && post.image && (
        <img
          src={post.image}
          alt="Publicação com foto"
          loading="lazy"
          className="mt-4 aspect-[16/10] w-full rounded-lg border border-line-1 object-cover"
        />
      )}

      <div className="mt-4 flex gap-6">
        <span className="inline-flex items-center gap-1.5 text-xs text-content-muted transition-colors hover:text-accent">
          <Heart className="size-4" aria-hidden="true" /> {post.likes}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-content-muted transition-colors hover:text-accent">
          <MessageCircle className="size-4" aria-hidden="true" /> {post.replies}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-content-muted transition-colors hover:text-accent">
          <Repeat className="size-4" aria-hidden="true" /> {post.reposts}
        </span>
      </div>
    </article>
  )
}

export default function ABandaMember({ memberId }: { memberId: string }) {
  const [following, setFollowing] = useState(false)
  const member = getMember(memberId)
  if (!member) return null

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-10 sm:px-6">
      <Link
        to="/a-banda"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-content-secondary transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        Voltar para A Banda
      </Link>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line-1 bg-surface-1">
        <div className={`h-40 w-full sm:h-56 ${member.coverClass}`} aria-hidden="true">
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.35),transparent_45%)]" />
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <img
                src={member.avatar}
                alt={`Perfil de ${member.name}`}
                loading="lazy"
                className="-mt-14 size-28 rounded-full border-4 border-surface-1 bg-surface-2 object-cover object-top shadow-lg"
              />
              <div className="pb-1">
                <h1 className="mt-2 flex flex-wrap items-center gap-1.5 font-display text-2xl font-extrabold tracking-tight text-content-primary sm:text-3xl">
                  {member.name}
                  <BadgeCheck className="size-5 text-accent" aria-hidden="true" />
                </h1>
                <p className="text-sm text-content-muted">{member.handle}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-accent">
                  {member.role}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:pb-1">
              {member.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-line-1 bg-surface-2 text-content-secondary transition-colors hover:border-accent/60 hover:text-accent"
                >
                  {s.icon === 'globe' ? (
                    <Globe className="size-4" aria-hidden="true" />
                  ) : (
                    <BrandIcon brand={s.icon} className="size-4" />
                  )}
                </a>
              ))}
              <button
                type="button"
                onClick={() => setFollowing((f) => !f)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  following
                    ? 'border border-line-1 bg-surface-2 text-content-primary hover:bg-surface-3'
                    : 'bg-accent text-content-inverse hover:bg-accent-hover'
                }`}
              >
                {following ? 'Seguindo' : 'Seguir'}
              </button>
            </div>
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" aria-hidden="true" /> {member.since}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" /> {member.location}
            </span>
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-content-secondary">
            {member.bio}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {member.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-line-1 bg-surface-2 px-4 py-3"
              >
                <dt className="text-[11px] font-medium uppercase tracking-wider text-content-muted">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 font-display text-lg font-bold text-content-primary">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-content-muted">
            * Seguidores, curtidas e posts são estimativas ilustrativas do
            fã-clube.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-label="Publicações">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-content-primary">
              Publicações
            </h2>
            <span className="rounded-full border border-line-1 bg-surface-2 px-2.5 py-0.5 text-xs text-content-muted">
              {member.posts.length}
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {member.posts.map((post, i) => (
              <PostRelative key={i} post={post} member={member} />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-line-1 bg-surface-1 p-6">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-content-muted">
              Em resumo
            </h3>
            <dl className="mt-4 space-y-3">
              {member.summary.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-content-muted">
                    {row.label}
                  </dt>
                  <dd className="text-right text-sm font-medium text-content-primary">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-line-1 bg-surface-1 p-6">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-content-muted">
              Álbuns na banda
            </h3>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {member.albumsIds.map((id) => {
                const album = ALBUMS.find((a) => a.id === id)
                if (!album) return null
                return (
                  <Link
                    key={id}
                    to={`/discos/${id}`}
                    title={album.name}
                    className="group overflow-hidden rounded-md border border-line-1 bg-surface-2 transition-transform hover:-translate-y-0.5"
                  >
                    <img
                      src={album.image}
                      alt={`${album.name} (${album.shortName})`}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </Link>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] text-content-muted">
              Disco a disco, clique para abrir a era.
            </p>
          </div>

          <div className="rounded-xl border border-line-1 bg-surface-1 p-6">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-content-muted">
              Amigos em comum
              <span className="rounded-full border border-line-1 bg-surface-2 px-2 py-0.5 text-[10px] text-content-muted">
                2
              </span>
            </h3>
            <div className="mt-4 space-y-3">
              {Object.keys(MEMBERS)
                .filter((id) => id !== member.id)
                .map((id) => {
                  const friend = MEMBERS[id as keyof typeof MEMBERS]
                  return (
                    <Link
                      key={id}
                      to={`/a-banda/${friend.id === 'hayley' ? 'hayley-williams' : friend.id === 'taylor' ? 'taylor-york' : 'zac-farro'}`}
                      className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-2"
                    >
                      <img
                        src={friend.avatar}
                        alt={`Foto de ${friend.name}`}
                        loading="lazy"
                        className="size-10 rounded-full border border-line-1 object-cover object-top"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-content-primary transition-colors group-hover:text-accent">
                          {friend.name}
                        </p>
                        <p className="truncate text-xs text-content-muted">
                          {friend.handle}
                        </p>
                      </div>
                      <span className="ml-auto text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                        Ver perfil
                      </span>
                    </Link>
                  )
                })}
            </div>
          </div>

          <div className="rounded-xl border border-line-1 bg-accent-subtle p-6">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-content-primary">
              <Sparkles className="size-4 text-accent" aria-hidden="true" /> Em
              destaque
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-content-secondary">
              {member.spotlight}
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}