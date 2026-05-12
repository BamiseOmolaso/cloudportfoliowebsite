"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";

export default function AboutPage() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const skills = [
    "Python",
    "TypeScript",
    "SQL",
    "Bash",
    "Terraform",
    "AWS",
    "Docker",
    "Next.js",
    "React",
    "Prisma",
    "PostgreSQL",
    "Redis",
    "GitHub Actions",
    "Machine Learning",
    "Power BI",
  ];

  const experience = [
    {
      title: "Data Science Consultant",
      company: "AMDARI",
      location: "Alberta, Canada",
      period: "Jan 2025 – Present",
      description:
        "Build predictive models and segmentation pipelines that have improved customer retention by ~15% and lifted revenue ~20% via targeted marketing. Deliver interactive dashboards that translate cohort and conversion data into decisions stakeholders actually act on.",
    },
    {
      title: "Cloud Community Lead",
      company: "NextWork",
      period: "Dec 2024 – Present",
      description:
        "Lead AWS project demos, mentoring sessions, and workshops covering ECS, networking, IAM, and the real-world failure modes that don’t make it into the official docs. Maintain project guides and tutorials that help community members ship production-shaped AWS work.",
    },
  ];

  const certifications = [
    { name: "AWS Certified Solutions Architect – Associate", year: "2025" },
    { name: "ALX Cloud Computing Professional", year: "2025" },
    { name: "AWS Certified Cloud Practitioner", year: "2024" },
    { name: "Google Data Analytics Professional", year: "2023" },
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Dr. Bamise Omolaso
            </h1>
            <p className="text-purple-400 text-lg mb-6">
              Medical doctor → cloud &amp; DevSecOps engineer. Building
              production systems the right way — in public.
            </p>
            <div className="space-y-4 text-gray-400 text-lg">
              <p>
                I&apos;m a medical doctor (MBChB) by training, building toward
                cloud and DevSecOps engineering. My background in healthcare
                data science taught me to take state, security, and
                reproducibility seriously — and that&apos;s exactly what shows
                up in the architecture work I focus on now.
              </p>
              <p>
                Currently consulting at{" "}
                <span className="text-white">AMDARI (Alberta, Canada)</span> on
                predictive analytics and ML pipelines, and leading the cloud
                community at <span className="text-white">NextWork</span>. AWS
                Certified Solutions Architect Associate and ALX Cloud Computing
                Professional.
              </p>
              <p>
                This site itself is the work — Next.js on ECS Fargate, fully
                Terraform-managed across dev/staging/prod, GitHub Actions OIDC
                into AWS (no long-lived keys), pause/resume that drops idle
                infra cost from ~$250/month to ~$1/month.{" "}
                <a
                  href="https://github.com/BamiseOmolaso/cloudportfoliowebsite/blob/main/ARCHITECTURE_GUIDE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Read the architecture →
                </a>
              </p>
            </div>
            <div className="flex flex-wrap gap-4 mt-8">
              <a
                href="/cv/Oluwabamise Omolaso_CV_2025.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View CV
              </a>
              <a
                href="/cv/Oluwabamise Omolaso_CV_2025.pdf"
                download
                className="inline-flex items-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download CV
              </a>
              <a
                href="https://www.linkedin.com/in/dr-bamise-omolaso/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-3 border border-purple-500 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Contact Me
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Skills</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {skills.map((skill) => (
                <div
                  key={skill}
                  className="bg-gray-800 rounded-lg p-3 text-center text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {skill}
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-sm mt-4">
              AWS services I&apos;ve shipped with: ECS Fargate · RDS · ALB · ECR
              · ACM · Secrets Manager · IAM · VPC · CloudWatch · Route 53 ·
              OIDC.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Experience</h2>
            <div className="space-y-6">
              {experience.map((job, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white">
                    {job.title}
                  </h3>
                  <p className="text-purple-400">
                    {job.company}
                    {job.location ? ` — ${job.location}` : ""}
                  </p>
                  <p className="text-gray-500 text-sm">{job.period}</p>
                  <p className="text-gray-400 mt-3">{job.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Certifications
            </h2>
            <div className="space-y-3">
              {certifications.map((cert) => (
                <div
                  key={cert.name}
                  className="flex justify-between items-center bg-gray-800 rounded-lg p-4"
                >
                  <span className="text-gray-300">{cert.name}</span>
                  <span className="text-purple-400 text-sm font-medium">
                    {cert.year}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Education</h2>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white">
                Bachelor of Medicine and Bachelor of Surgery (MBChB)
              </h3>
              <p className="text-purple-400">
                Obafemi Awolowo University (OAU), Ile-Ife, Nigeria
              </p>
              <p className="text-gray-500 text-sm">Jun 2014 – Oct 2021</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
