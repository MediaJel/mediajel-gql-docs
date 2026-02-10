import dotenv from "dotenv";
import path from "path";

// Load .env.local (Next.js convention) then .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import { NotionClient } from "./notion-client.js";

interface KBSection {
  title: string;
  icon: string;
  pages: { title: string; content: string }[];
}

const KB_STRUCTURE: KBSection[] = [
  {
    title: "Company",
    icon: "🏢",
    pages: [
      {
        title: "About MediaJel",
        content: `# About MediaJel

## Mission
Create an equitable digital marketing landscape for regulated brands globally.

## Vision
Level the digital playing field for cannabis companies facing unique industry challenges.

## Purpose
MediaJel addresses the unique challenges facing cannabis and regulated industries:
- Inconsistent legislation across states and countries
- Unsettled advertising guidelines that change frequently
- Limited channel access on mainstream platforms
- Complex compliance requirements

## Core Values

### Passionate
We are revolutionizing cannabis marketing by bringing enterprise-grade solutions to an underserved industry.

### Customer-First
We prioritize client satisfaction above all else, ensuring our solutions directly address their needs.

### Game-Changers
We innovate through data strategy and technology, staying ahead of industry trends.

### Data Ethics
We center ethical principles in all data collection and usage, maintaining strict PII management.

### Outcome-Driven
We focus on measurable business results, tying all marketing efforts to revenue impact.

### Transparent
We build trust through honest communication and defensible reporting.`,
      },
      {
        title: "Team",
        content: `# MediaJel Leadership Team

## Executive Team

### Jake Litke - Chief Executive Officer
Leads overall company strategy and vision for MediaJel.

### Dana Szova - Chief Technology Officer
Oversees all technology development, platform architecture, and engineering teams.

### Russ Fagaly - Chief Operating Officer
Manages day-to-day operations and ensures operational excellence across all departments.

### Edward Montanus - Chief Strategy Officer
Drives strategic initiatives, partnerships, and market expansion opportunities.

### Cortney Brown - Chief Marketing Officer
Leads marketing efforts, brand strategy, and market positioning.

### Megan Oliver - SVP, Customer Success
Ensures client satisfaction and manages customer success operations.`,
      },
    ],
  },
  {
    title: "Product",
    icon: "📦",
    pages: [
      {
        title: "Overview",
        content: `# MediaJel Platform Overview

MediaJel provides an integrated advertising and attribution platform specifically designed for regulated industries. The platform consists of three core integrated tools:

## MediaJel Buyer
Our media buying and optimization platform enables:
- Compliant programmatic advertising across multiple channels
- Real-time campaign optimization
- Access to premium mainstream inventory

## DataJel
Customer and revenue attribution system that provides:
- Multi-touch attribution tracking
- Revenue and ROAS measurement
- Cross-device tracking capabilities

## DemoGraph
Audience building and intelligence platform featuring:
- 196 million verified 21+ profiles
- Government-verified age data
- 115+ behavioral data points
- Advanced targeting capabilities`,
      },
      {
        title: "Features",
        content: `# MediaJel Platform Features

## DemoGraph Audience Builder

### Audience Data
- 196 million verified 21+ profiles
- Government-verified age data with up to 90% LDA (Legal Drinking Age) compliance
- 115+ behavioral data points
- 1,500+ data attributes for precise targeting

### Channel Coverage
- 175,000+ mainstream websites and apps
- Cross-device targeting: mobile, desktop, tablet, audio, CTV, DOOH

### Data Management
- Monthly data refreshes to ensure accuracy
- Strict PII management protocols
- First-party data enrichment with demographic insights
- Multi-touch attribution connecting conversions across customer journeys

---

## Marketing Attribution Dashboard

### Real-Time Reporting
- 24/7 accessible dashboard
- Data updates every 20 minutes
- Revenue and ROAS refresh daily at 12am PST

### Cross-Device Tracking
- IP matching
- Device Match technology
- Mobile Advertising IDs (MAIDs)

### Key Metrics
- Impressions and CTR
- Sign-ups and registrations
- Transactions and revenue
- ROAS (Return on Ad Spend)
- CPO (Cost Per Order)

### Additional Features
- Buyer journey visibility across mobile, desktop, CTV, DOOH
- White-label customization available for agencies

---

## Search Lights Self-Service Platform

### Capabilities
- Self-service programmatic advertising
- 24/7 analytics dashboard access
- A/B testing capabilities
- Pre-launch compliance verification
- eCommerce conversion pixel tracking

### Pricing Tiers

#### Essential - $500/month
- Basic regulated inventory access
- Mobile-only targeting
- $7 CPM

#### Pro - $1,500/month
- Premium inventory access
- All device targeting (mobile, desktop, tablet)
- $7-12 CPM

#### Elite - $2,500/month
- Semantic targeting capabilities
- Video + display formats
- $7-30 CPM

---

## White-Label SaaS Platform

### For Agencies
Designed for agencies expanding their service offerings to regulated industries.

### Features
- Full-service dashboard with real-time updates
- Bulk geo-upload (zip codes or polygon drawing)
- Pre-launch compliance audit
- API-ready integration

### Partnership Models
- **Managed Service**: MediaJel handles campaign management
- **Self-Service Launcher**: Agency operates independently with platform access`,
      },
    ],
  },
  {
    title: "Technical",
    icon: "⚙️",
    pages: [
      {
        title: "Architecture",
        content: `# Attribution Methodology & Technical Architecture

## Multi-Touch Attribution

MediaJel uses multi-touch attribution to track the complete customer journey from first impression to final purchase.

### Device Matching
- Customer identity graph for cross-device recognition
- IP address matching
- Mobile Advertising ID (MAID) tracking
- Device fingerprinting

### Attribution Windows
- Flexible attribution windows from 1-30 days
- Configurable based on campaign type and sales cycle

### Data Matching
- Order ID cross-reference with POS data
- Direct integration with major cannabis POS systems
- Real-time transaction matching

## Tracking Flow

1. **Impressions**: Ad views tracked across all channels
2. **Engagement**: Clicks, video views, and interactions recorded
3. **Sign-ups**: Registration and newsletter captures attributed
4. **Walk-ins**: Store visits matched via device location
5. **Revenue**: Purchases tied back to originating campaigns

## Data Pipeline
- Real-time data ingestion
- 20-minute refresh cycles for campaign metrics
- Daily revenue reconciliation at 12am PST
- Monthly audience data refreshes`,
      },
      {
        title: "Integrations",
        content: `# Advertising Channels & Integrations

## Supported Advertising Channels

### Display Advertising
Programmatic display ads across premium inventory networks.

### Native Advertising
Seamlessly integrated ads matching publisher content styles.

### Connected TV (CTV)
Streaming TV advertising on major platforms and devices.

### Digital Out-of-Home (DOOH)
Digital billboard and screen advertising in physical locations.

### Video Advertising
Pre-roll, mid-roll, and outstream video formats.

### Google Ads
Compliant Google advertising for eligible products (topical CBD with certification).

### SEO/AEO
Search engine optimization and answer engine optimization services.

### SMS Marketing
Text message marketing campaigns with compliance built-in.

### Social Media Marketing
Compliant social strategies across available platforms.

## POS Integrations
- Dutchie
- Jane
- Treez
- Flowhub
- Meadow
- Other major cannabis POS systems

## CRM Integrations
- HubSpot
- Salesforce
- Custom CRM via API`,
      },
    ],
  },
  {
    title: "Operations",
    icon: "🛠️",
    pages: [
      {
        title: "Cannabis Advertising Compliance",
        content: `# Cannabis Advertising Compliance Playbook

## Legal Landscape (2025)

### State Regulations
- 24 states permit adult-use cannabis
- 38 states allow medical marijuana
- Cannabis remains Schedule I federally

## Key Compliance Requirements

### Age Verification
- 76.6%+ of target households must be 21+
- Government-verified age data required
- LDA (Legal Drinking Age) compliance mandatory

### LegitScript Certification
- Required for topical CBD advertising on Google and Meta
- Certification process involves product and business verification
- Must be renewed annually

### Geo-Targeting Requirements
- Campaigns must be confined to legal states only
- Avoid targeting near schools and youth-focused areas
- Buffer zones required around prohibited locations

## Platform-Specific Policies

### Google
- Topical CBD products only (with LegitScript certification)
- No THC or ingestible CBD products
- Strict landing page requirements

### Meta (Facebook/Instagram)
- Limited hemp promotion allowed
- No direct cannabis product advertising
- Educational content may be permitted

### Twitter/X
- Cannabis ads permitted with restrictions
- Age-gating required
- Geographic restrictions enforced

## Best Practices
1. Always verify current state regulations before campaign launch
2. Maintain up-to-date compliance documentation
3. Use pre-launch compliance audits
4. Monitor campaigns for policy changes
5. Document all compliance measures for audit purposes`,
      },
      {
        title: "FAQs",
        content: `# Frequently Asked Questions

## Legal Advertising Channels

### Q: What advertising channels are legally available for cannabis businesses?

**A:** The following channels are available with proper compliance measures:

1. **SEO (Search Engine Optimization)**
   - Organic search visibility
   - No platform restrictions
   - Long-term sustainable traffic

2. **Programmatic Advertising**
   - Through cannabis-specific platforms like MediaJel
   - Access to mainstream inventory with compliance built-in
   - Display, video, CTV, and DOOH formats

3. **Influencer Partnerships**
   - Carefully vetted influencer collaborations
   - Must follow disclosure requirements
   - Age-gated audiences only

4. **Educational Content Marketing**
   - Blog posts, guides, and resources
   - Positions brand as industry authority
   - Drives organic engagement

5. **Email Marketing**
   - Direct communication with opted-in customers
   - Must comply with CAN-SPAM
   - Age verification on sign-up

## Attribution Questions

### Q: How does MediaJel track conversions?

**A:** MediaJel uses multi-touch attribution with:
- Cross-device tracking via IP, device matching, and MAIDs
- POS integration for transaction data
- Flexible attribution windows (1-30 days)

### Q: How often is data updated?

**A:**
- Campaign metrics: Every 20 minutes
- Revenue and ROAS: Daily at 12am PST
- Audience data: Monthly refreshes

## Platform Questions

### Q: What is the minimum budget to work with MediaJel?

**A:** Clients should have minimum $25k monthly digital revenue to see meaningful results from our platform.

### Q: Do you offer self-service options?

**A:** Yes, our Search Lights platform offers self-service programmatic advertising starting at $500/month.`,
      },
    ],
  },
  {
    title: "Sales & Marketing",
    icon: "📈",
    pages: [
      {
        title: "Positioning",
        content: `# Market Positioning

## Target Industries

### Primary Markets
- **Cannabis Dispensaries**: Single and multi-location retailers
- **Cannabis MSOs**: Multi-state operators requiring unified reporting
- **Cannabis Delivery**: Delivery-focused operations
- **Cannabis Brands**: Product manufacturers and wholesalers
- **CBD Brands**: Hemp-derived CBD product companies

### Secondary Markets
- **Gaming**: Online gaming and gambling companies
- **Alcohol**: Beverage alcohol brands
- **Politics**: Political campaign advertising
- **Sexual Wellness**: Adult wellness product companies

## Ideal Client Profile

### Multi-Location Operators
- Need "defensible reporting tied to revenue"
- Require unified cross-location analytics
- Seeking enterprise-grade solutions

### Compliance-Focused Businesses
- Prioritize compliance + performance equally
- Value brand safety and risk mitigation
- Need audit-ready reporting

### Revenue Requirements
- Minimum $25k monthly digital revenue
- Looking for measurable ROAS
- Ready to invest in upper-funnel marketing

### Data-Driven Organizations
- Seeking cross-channel clarity vs isolated metrics
- Want to understand full customer journey
- Ready to integrate POS data for attribution`,
      },
      {
        title: "Competitive Analysis",
        content: `# Competitive Analysis & Value Propositions

## Key Value Propositions

### Brand Safety
"Brand Safety. No Campaign Cancellations. No Costly Mistakes."

MediaJel's compliance-first approach means:
- Pre-launch compliance verification
- No campaign takedowns or policy violations
- Consistent, uninterrupted advertising

### Revenue Attribution
Proving upper-funnel marketing value through:
- Direct revenue attribution
- ROAS measurement at the campaign level
- Cross-channel journey visibility

### Mainstream Inventory Access
Access to mainstream advertising inventory typically unavailable to regulated sectors:
- 175,000+ websites and apps
- Premium publishers and networks
- CTV and DOOH placements

## Competitive Differentiators

### vs. General Ad Platforms
- Purpose-built for regulated industries
- Compliance expertise included
- No risk of account bans or shutdowns

### vs. Cannabis-Only Networks
- Access to mainstream inventory
- Larger audience reach
- Premium placement quality

### vs. In-House Marketing
- Specialized compliance knowledge
- Advanced attribution technology
- Dedicated audience data (196M profiles)

## Objection Handling

### "We've tried digital before and it didn't work"
- MediaJel provides revenue attribution proving actual ROI
- Unlike other platforms, we show direct connection to sales

### "Digital advertising is too risky for cannabis"
- Our compliance-first approach has zero campaign cancellations
- Pre-launch audits catch issues before they become problems

### "We can't measure the impact"
- Our attribution dashboard updates every 20 minutes
- Direct POS integration shows actual revenue impact`,
      },
      {
        title: "Case Studies",
        content: `# Client Case Studies

## Display Advertising Success Stories

### California Delivery Service
- **Channel**: Display Ads
- **Challenge**: Building brand awareness in competitive market
- **Solution**: Geo-targeted display campaigns with audience optimization
- **Results**: Increased delivery orders and brand recognition

### High Profile CBD Brands
- **Channel**: Display Ads
- **Challenge**: Reaching mainstream audiences with CBD products
- **Solution**: Compliant display advertising on premium inventory
- **Results**: Expanded market reach beyond cannabis-specific channels

### Canadian Cannabis Retailer
- **Channel**: Display Ads
- **Challenge**: Building presence in newly legal Canadian market
- **Solution**: Cross-device display campaigns with attribution tracking
- **Results**: Measurable foot traffic and revenue attribution

### Vireo Health
- **Channel**: Display Ads
- **Challenge**: Multi-state brand consistency
- **Solution**: Unified campaign management across markets
- **Results**: Consistent messaging with localized compliance

## Google Ads & SEO Success Stories

### Ethos
- **Channels**: Google Ads & SEO
- **Results**: Improved organic visibility and compliant paid search presence

### Clear Choice Cannabis
- **Channels**: Marketing & SEO
- **Results**: Comprehensive digital presence with measurable growth

## Website & SEO Projects

### Cloud Cannabis
- **Channel**: Website Design
- **Results**: Modern, compliant website driving conversions

### Have a Heart
- **Channels**: Marketing & SEO
- **Results**: Full-service marketing with organic growth

### Haven
- **Channel**: SEO
- **Results**: Improved search rankings and organic traffic

### Remedy Columbia
- **Channel**: SEO
- **Results**: Local SEO dominance in market`,
      },
    ],
  },
  {
    title: "Services",
    icon: "🎯",
    pages: [
      {
        title: "Cannabis Dispensary Marketing",
        content: `# Cannabis Dispensary Marketing Services

## Core Advertising Solutions

### Geotargeted Display Ads
Drive foot traffic with location-based display advertising:
- Target customers near dispensary locations
- Competitor conquesting campaigns
- Radius and polygon targeting options

### Data-Driven Targeting

#### First-Party Data
- CRM and customer list targeting
- Website visitor retargeting
- Email subscriber activation

#### Third-Party Data
- 196M verified 21+ profiles
- Behavioral targeting segments
- Cannabis enthusiast audiences

### Lookalike Audience Generation
- Find new customers similar to best existing customers
- Expand reach while maintaining quality
- Continuous optimization based on conversion data

### Integration Options
- Website visitor retargeting pixels
- CRM integration for customer matching
- POS integration for revenue attribution

## Challenges We Address

### IRS 280E Tax Regulation
- Marketing efficiency is critical under 280E limitations
- Every dollar must prove ROI
- Our attribution helps justify marketing spend

### Discount-Driven Price Competition
- Build brand loyalty beyond price
- Reach customers before they're in deal-hunting mode
- Upper-funnel awareness drives long-term value

### Third-Party Marketplace Dependency
- Reduce reliance on Weedmaps, Leafly, etc.
- Build direct customer relationships
- Own your customer data and journey

### Regional Compliance Complexity
- Navigate state-by-state regulations
- Pre-launch compliance checks
- Ongoing monitoring for policy changes`,
      },
      {
        title: "Cannabis Marketing Agency Services",
        content: `# Cannabis Marketing Agency Services

## Our Philosophy

> "We do not start with tactics. We start with your growth model."

MediaJel takes a strategic approach to cannabis marketing, beginning with business fundamentals before recommending tactics.

## Strategic Planning Process

### 1. Target Audience Analysis
- Define ideal customer profiles
- Identify high-value segments
- Map customer journey touchpoints

### 2. Expansion Planning
- Market prioritization
- Geographic targeting strategy
- Competitive landscape assessment

### 3. Revenue Goal Setting
- Define measurable objectives
- Establish KPIs and benchmarks
- Create accountability framework

### 4. Compliance Requirements
- State-by-state regulation review
- Platform policy assessment
- Risk mitigation planning

## Full-Service Capabilities

### Media Buying
- Programmatic display and video
- Connected TV (CTV)
- Digital Out-of-Home (DOOH)
- Native advertising

### Search Marketing
- SEO optimization
- Google Ads (where permitted)
- Answer Engine Optimization (AEO)

### Analytics & Attribution
- Multi-touch attribution setup
- Dashboard customization
- Regular performance reporting

### Creative Services
- Ad creative development
- Landing page optimization
- Compliance review

## Partnership Models

### Managed Service
Full campaign management by MediaJel team:
- Strategy development
- Campaign execution
- Ongoing optimization
- Regular reporting and insights

### Self-Service
Platform access with agency control:
- Search Lights dashboard access
- Training and onboarding
- Technical support
- Flexible pricing tiers`,
      },
    ],
  },
  {
    title: "API Glossary",
    icon: "📖",
    pages: [
      {
        title: "Business Terms to API Mapping",
        content: `# Business Terms to API Mapping

This guide helps you translate common business questions into the correct MediaJel GraphQL API operations.

## Performance & Analytics

### Weekly Performance Report
**Business Need:** "Show me weekly performance report" or "What's our weekly metrics?"

**API Operation:** \`pacingDataObjectsConnection\`

Use the pacing data endpoint with date filtering to retrieve daily metrics that can be aggregated for weekly reports.

\`\`\`graphql
query WeeklyPerformance($where: PacingDataObjectWhereInput, $first: Int) {
  pacingDataObjectsConnection(where: $where, first: $first, orderBy: date_DESC) {
    edges {
      node {
        id
        date
        impressions
        clicks
        spend
        revenue
        ctr
        cpm
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
\`\`\`

**Variables:**
\`\`\`json
{
  "where": {
    "date_gte": "2025-02-03",
    "date_lte": "2025-02-10"
  },
  "first": 100
}
\`\`\`

---

### ROAS (Return on Ad Spend)
**Business Need:** "What's our ROAS?" or "Show me return on ad spend"

**API Operation:** \`pacingDataObjectsConnection\`

ROAS is calculated as revenue / spend. Query pacing data and calculate the ratio.

\`\`\`graphql
query ROASData($where: PacingDataObjectWhereInput, $first: Int) {
  pacingDataObjectsConnection(where: $where, first: $first) {
    edges {
      node {
        id
        date
        spend
        revenue
        campaignOrder {
          id
          name
        }
      }
    }
  }
}
\`\`\`

---

### Attribution Data
**Business Need:** "Show attribution data" or "What conversions are attributed to campaigns?"

**API Operation:** \`attributionEventsConnection\`

Attribution events track customer conversions attributed to advertising campaigns.

---

## Campaign Management

### List Campaigns
**Business Need:** "Show all campaigns" or "List active campaigns"

**API Operation:** \`campaignsConnection\`

\`\`\`graphql
query ListCampaigns($where: CampaignWhereInput, $first: Int, $orderBy: CampaignOrderByInput) {
  campaignsConnection(where: $where, first: $first, orderBy: $orderBy) {
    edges {
      node {
        id
        name
        status
        createdAt
        orgs {
          id
          name
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
\`\`\`

---

### Campaign Orders
**Business Need:** "Show our campaign orders" or "List active orders"

**API Operation:** \`campaignOrdersConnection\`

Campaign orders represent the business agreements including budgets and schedules.

\`\`\`graphql
query ActiveCampaignOrders($where: CampaignOrderWhereInput, $first: Int) {
  campaignOrdersConnection(where: $where, first: $first, orderBy: createdAt_DESC) {
    edges {
      node {
        id
        name
        status
        startDate
        endDate
        totalBudget
        campaigns {
          id
          name
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
\`\`\`

---

## Organizations & Users

### List Organizations
**Business Need:** "Show all organizations" or "List our clients"

**API Operation:** \`orgsConnection\`

\`\`\`graphql
query ListOrganizations($first: Int, $orderBy: OrgOrderByInput) {
  orgsConnection(first: $first, orderBy: $orderBy) {
    edges {
      node {
        id
        name
        status
        createdAt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
\`\`\`

---

### Users
**Business Need:** "List users in an organization" or "Show team members"

**API Operation:** \`usersConnection\`

---

## Creative Assets

### List Creatives
**Business Need:** "Show our ad creatives" or "List creative assets"

**API Operation:** \`creativesConnection\`

\`\`\`graphql
query ListCreatives($where: CreativeWhereInput, $first: Int) {
  creativesConnection(where: $where, first: $first) {
    edges {
      node {
        id
        name
        type
        status
        mediaUrl
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
\`\`\``,
      },
      {
        title: "Common API Use Cases",
        content: `# Common API Use Cases

## Authentication

All API requests require authentication. Use the \`authSignIn\` mutation to obtain tokens.

\`\`\`graphql
mutation SignIn($data: AuthSignInInput!) {
  authSignIn(data: $data) {
    accessToken
    idToken
    refreshToken
  }
}
\`\`\`

**Variables:**
\`\`\`json
{
  "data": {
    "username": "your-email@example.com",
    "password": "your-password"
  }
}
\`\`\`

After authentication:
1. Use \`accessToken\` in the \`Authorization: Bearer <token>\` header
2. Include your organization ID in the \`Key\` header
3. Tokens expire after ~1 hour; use \`authRefreshToken\` to obtain new tokens

---

## Pagination

Most list operations support cursor-based pagination using the Connection pattern:

- \`first\`: Number of items to return
- \`after\`: Cursor for next page
- \`last\`: Number of items from the end
- \`before\`: Cursor for previous page

**Example:**
\`\`\`graphql
query PaginatedCampaigns($first: Int, $after: String) {
  campaignsConnection(first: $first, after: $after) {
    edges {
      node {
        id
        name
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
\`\`\`

---

## Filtering

Use the \`where\` argument to filter results:

\`\`\`graphql
query FilteredCampaigns($where: CampaignWhereInput) {
  campaignsConnection(where: $where, first: 10) {
    edges {
      node {
        id
        name
        status
      }
    }
  }
}
\`\`\`

**Filter by status:**
\`\`\`json
{
  "where": {
    "status": "ACTIVE"
  }
}
\`\`\`

**Filter by date range:**
\`\`\`json
{
  "where": {
    "createdAt_gte": "2025-01-01",
    "createdAt_lte": "2025-01-31"
  }
}
\`\`\`

---

## Sorting

Use the \`orderBy\` argument to sort results:

\`\`\`graphql
query SortedCampaigns($orderBy: CampaignOrderByInput) {
  campaignsConnection(first: 10, orderBy: $orderBy) {
    edges {
      node {
        id
        name
        createdAt
      }
    }
  }
}
\`\`\`

Common sort options:
- \`createdAt_DESC\` - Newest first
- \`createdAt_ASC\` - Oldest first
- \`name_ASC\` - Alphabetical
- \`name_DESC\` - Reverse alphabetical

---

## Rate Limits

The API is rate limited to 100 requests per minute per organization.

Rate limit information is returned in response headers:
- \`X-RateLimit-Limit\`: Maximum requests per minute
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Time when the rate limit resets`,
      },
    ],
  },
];

async function main() {
  console.log("======================================");
  console.log("   Build Knowledge Base Structure    ");
  console.log("======================================");
  console.log();

  const notionApiKey = process.env.NOTION_API_KEY || process.env.NOTION_SECRET;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  if (!notionApiKey) {
    throw new Error("NOTION_API_KEY or NOTION_SECRET environment variable is required");
  }
  if (!parentPageId) {
    throw new Error("NOTION_PARENT_PAGE_ID environment variable is required");
  }

  const client = new NotionClient(notionApiKey);

  console.log("Creating Knowledge Base structure...\n");

  // Create root Knowledge Base page
  console.log("Creating root page: Knowledge Base");
  const rootPage = await client.createPage(
    parentPageId,
    "Knowledge Base",
    "📚",
    "Welcome to the MediaJel Knowledge Base. This is the central repository for all company documentation."
  );
  console.log(`  Created: ${rootPage.url}\n`);

  // Create sections
  for (const section of KB_STRUCTURE) {
    console.log(`Creating section: ${section.icon} ${section.title}`);
    const sectionPage = await client.createPage(
      rootPage.id,
      section.title,
      section.icon
    );

    // Create pages under section
    for (const page of section.pages) {
      console.log(`  Creating page: ${page.title}`);
      await client.createPage(sectionPage.id, page.title, undefined, page.content);
    }
  }

  console.log("\n======================================");
  console.log("   Knowledge Base Created!           ");
  console.log("======================================");
  console.log();
  console.log(`Root page: ${rootPage.url}`);
  console.log();
  console.log("Next steps:");
  console.log("1. Open the Knowledge Base in Notion");
  console.log("2. Share the page with your Notion integration");
  console.log("3. Add the page ID to your .env file:");
  console.log(`   NOTION_ROOT_PAGE_ID=${rootPage.id.replace(/-/g, "")}`);
  console.log();
  console.log("Then run 'npm run sync:knowledge' to sync to OpenAI.");
}

main().catch((error) => {
  console.error("\nFailed to create Knowledge Base:", error);
  process.exit(1);
});
