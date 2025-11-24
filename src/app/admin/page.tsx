import { db } from '@/lib/db';
import Link from 'next/link';
import { motion } from 'framer-motion';

async function getStats() {
  const [
    totalSubscribers,
    activeSubscribers,
    totalNewsletters,
    sentNewsletters,
    totalProjects,
    activeProjects,
    averageOpenRate,
    averageClickRate,
  ] = await Promise.all([
    db.newsletterSubscriber.count(),
    db.newsletterSubscriber.count({ where: { isSubscribed: true } }),
    db.newsletter.count(),
    db.newsletter.count({ where: { status: 'sent' } }),
    db.project.count(),
    db.project.count({ where: { status: 'published' } }),
    db.newsletter.aggregate({
      _avg: { openRate: true },
      where: { status: 'sent' },
    }),
    db.newsletter.aggregate({
      _avg: { clickRate: true },
      where: { status: 'sent' },
    }),
  ]);

  return {
    totalSubscribers,
    activeSubscribers,
    totalNewsletters,
    sentNewsletters,
    totalProjects,
    activeProjects,
    averageOpenRate: averageOpenRate._avg.openRate ?? 0,
    averageClickRate: averageClickRate._avg.clickRate ?? 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="p-4 pt-6">
      <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

      {/* Stats Cards - Better spacing, consistent heights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-lg border border-gray-800 p-5 h-full shadow-lg hover:shadow-xl transition-all hover:border-gray-700"
        >
          <h2 className="text-lg font-medium text-gray-300 mb-2">Subscribers</h2>
          <p className="text-3xl font-bold text-white">{stats?.totalSubscribers}</p>
          <p className="text-sm text-gray-400 mt-2">
            {stats?.activeSubscribers} active
          </p>
          <div className="mt-4">
            <Link
              href="/admin/subscribers"
              className="inline-block text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              View all →
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900 rounded-lg border border-gray-800 p-5 h-full shadow-lg hover:shadow-xl transition-all hover:border-gray-700"
        >
          <h2 className="text-lg font-medium text-gray-300 mb-2">Newsletters</h2>
          <p className="text-3xl font-bold text-white">{stats?.totalNewsletters}</p>
          <p className="text-sm text-gray-400 mt-2">
            {stats?.sentNewsletters} sent
          </p>
          <div className="mt-4">
            <Link
              href="/admin/newsletters"
              className="inline-block text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              View all →
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900 rounded-lg border border-gray-800 p-5 h-full shadow-lg hover:shadow-xl transition-all hover:border-gray-700"
        >
          <h2 className="text-lg font-medium text-gray-300 mb-2">Projects</h2>
          <p className="text-3xl font-bold text-white">{stats?.totalProjects}</p>
          <p className="text-sm text-gray-400 mt-2">
            {stats?.activeProjects} active
          </p>
          <div className="mt-4">
            <Link
              href="/admin/projects"
              className="inline-block text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              View all →
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900 rounded-lg border border-gray-800 p-5 h-full shadow-lg hover:shadow-xl transition-all hover:border-gray-700"
        >
          <h2 className="text-lg font-medium text-gray-300 mb-2">Newsletter Performance</h2>
          <p className="text-3xl font-bold text-white">
            {stats?.averageOpenRate?.toFixed(1) || "0"}%
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Average open rate
          </p>
          <div className="mt-4">
            <Link
              href="/admin/performance"
              className="inline-block text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              View metrics →
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Action Cards - Better spacing */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900 rounded-lg border border-gray-800 p-6 shadow-lg hover:shadow-xl transition-all"
        >
          <h2 className="text-xl font-semibold text-white mb-5">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/blog/new"
              className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              Create New Blog Post
            </Link>
            <Link
              href="/admin/projects/new"
              className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              Add New Project
            </Link>
            <Link
              href="/admin/newsletters/new"
              className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              Create Newsletter
            </Link>
            <Link
              href="/admin/subscribers/import"
              className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              Import Subscribers
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-900 rounded-lg border border-gray-800 p-6 shadow-lg hover:shadow-xl transition-all"
        >
          <h2 className="text-xl font-semibold text-white mb-5">Recent Activity</h2>
          <div className="space-y-4">
            {/* Add recent activity items here */}
            <div className="flex items-center p-3 border border-gray-800 rounded-lg bg-gray-800/50">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <div className="text-gray-300">No recent activity</div>
            </div>
            <Link 
              href="/admin/performance" 
              className="block text-center mt-4 text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              View all activity →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 