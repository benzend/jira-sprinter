# Jira Sprint Creator

A Next.js application that helps you create Jira tickets from documents using AI. This tool analyzes your document content and automatically generates structured Jira tickets with appropriate titles, descriptions, types, and priorities.

## Features

- AI-powered document analysis to create structured Jira tickets
- Secure user authentication and API key management
- Jira integration with customizable project settings
- Modern UI with dark mode support
- PostgreSQL database for data persistence

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database
- OpenAI API key
- Jira account with API access

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/benzend/jira-sprinter.git
cd jira-sprinter
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up your environment variables:
   Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/jira_sprinter"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. Set up the database:

```bash
npx prisma migrate dev
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

1. Create an account and log in
2. Add your OpenAI API key in the dashboard
3. Configure your Jira credentials (domain, email, API token, and project key)
4. Paste your document content and let the AI generate Jira tickets
5. Review and create the tickets in your Jira project

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [Prisma](https://www.prisma.io) - Database ORM
- [PostgreSQL](https://www.postgresql.org) - Database
- [OpenAI](https://openai.com) - AI document analysis
- [Jira API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/) - Jira integration
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [NextAuth.js](https://next-auth.js.org) - Authentication

## Contributing

Feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
