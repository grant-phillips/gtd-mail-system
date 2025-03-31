import { RuleBasedClassifier } from '../services/classification/RuleBasedClassifier';
import { Email, EmailAddress } from '../types/email';
import {
  EmailCategory,
  ClassificationMetadata,
  ClassificationCorrection
} from '../types/classification';

interface Env {
  DB: D1Database;
  CLASSIFICATION_BUCKET: R2Bucket;
  RATE_LIMIT: RateLimiter;
}

interface RateLimiter {
  check(key: string, limit: number, window: number): Promise<boolean>;
}

interface ClassificationRequest {
  email: Email;
  userId: string;
}

interface BatchClassificationRequest {
  emails: Email[];
  userId: string;
}

interface ClassificationResponse {
  success: boolean;
  data?: {
    classification: ClassificationMetadata;
    confidence: number;
    reasoning: string[];
  };
  error?: string;
}

interface BatchClassificationResponse {
  success: boolean;
  data?: {
    results: {
      emailId: string;
      classification: ClassificationMetadata;
      confidence: number;
      reasoning: string[];
    }[];
  };
  error?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Rate limiting
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const isRateLimited = await env.RATE_LIMIT.check(ip, 100, 60); // 100 requests per minute
    if (!isRateLimited) {
      return new Response('Rate limit exceeded', { status: 429 });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Route handling
      if (path === '/api/emails/classify' && method === 'POST') {
        return handleClassifyEmail(request, env);
      } else if (path.match(/^\/api\/emails\/[^/]+\/category$/) && method === 'PATCH') {
        return handleUpdateCategory(request, env);
      } else if (path === '/api/emails/batch/categorize' && method === 'POST') {
        return handleBatchClassify(request, env);
      } else if (path === '/api/emails' && method === 'GET') {
        return handleGetEmailsByCategory(request, env);
      } else {
        return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
};

async function handleClassifyEmail(request: Request, env: Env): Promise<Response> {
  const { email, userId } = await request.json<ClassificationRequest>();
  
  // Validate request
  if (!email || !userId) {
    return new Response('Missing required fields', { status: 400 });
  }

  // Initialize classifier
  const classifier = new RuleBasedClassifier();

  // Classify email
  const result = classifier.classify(email);

  // Store classification result
  await storeClassification(env, email.id, userId, result);

  const response: ClassificationResponse = {
    success: true,
    data: {
      classification: result.metadata,
      confidence: result.confidence,
      reasoning: result.reasoning
    }
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleUpdateCategory(request: Request, env: Env): Promise<Response> {
  const emailId = request.url.split('/')[3];
  const { classification, userId } = await request.json<{
    classification: ClassificationMetadata;
    userId: string;
  }>();

  // Validate request
  if (!classification || !userId) {
    return new Response('Missing required fields', { status: 400 });
  }

  // Update classification in database
  await env.DB.prepare(`
    UPDATE email_classifications
    SET category = ?, priority = ?, action_status = ?, labels = ?,
        due_date = ?, scheduled_date = ?, project = ?, context = ?,
        last_updated = ?, last_updated_by = ?
    WHERE email_id = ? AND user_id = ?
  `).bind(
    classification.category,
    classification.priority,
    classification.actionStatus,
    JSON.stringify(classification.labels),
    classification.dueDate?.toISOString(),
    classification.scheduledDate?.toISOString(),
    classification.project,
    classification.context,
    new Date().toISOString(),
    'user',
    emailId,
    userId
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleBatchClassify(request: Request, env: Env): Promise<Response> {
  const { emails, userId } = await request.json<BatchClassificationRequest>();

  // Validate request
  if (!emails?.length || !userId) {
    return new Response('Missing required fields', { status: 400 });
  }

  // Initialize classifier
  const classifier = new RuleBasedClassifier();

  // Process emails in parallel
  const results = await Promise.all(
    emails.map(async (email) => {
      const result = classifier.classify(email);
      await storeClassification(env, email.id, userId, result);
      return {
        emailId: email.id,
        classification: result.metadata,
        confidence: result.confidence,
        reasoning: result.reasoning
      };
    })
  );

  const response: BatchClassificationResponse = {
    success: true,
    data: { results }
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGetEmailsByCategory(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const userId = url.searchParams.get('userId');

  // Validate request
  if (!category || !userId) {
    return new Response('Missing required parameters', { status: 400 });
  }

  // Query emails by category
  const { results } = await env.DB.prepare(`
    SELECT e.*, ec.*
    FROM emails e
    JOIN email_classifications ec ON e.id = ec.email_id
    WHERE ec.category = ? AND ec.user_id = ?
    ORDER BY ec.priority DESC, e.date DESC
    LIMIT 100
  `).bind(category, userId).all();

  return new Response(JSON.stringify({ success: true, data: results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function storeClassification(
  env: Env,
  emailId: string,
  userId: string,
  result: {
    metadata: ClassificationMetadata;
    confidence: number;
    reasoning: string[];
  }
): Promise<void> {
  // Store in D1 database
  await env.DB.prepare(`
    INSERT INTO email_classifications (
      email_id, user_id, category, priority, action_status,
      labels, due_date, scheduled_date, project, context,
      confidence, reasoning, last_updated, last_updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email_id, user_id) DO UPDATE SET
      category = excluded.category,
      priority = excluded.priority,
      action_status = excluded.action_status,
      labels = excluded.labels,
      due_date = excluded.due_date,
      scheduled_date = excluded.scheduled_date,
      project = excluded.project,
      context = excluded.context,
      confidence = excluded.confidence,
      reasoning = excluded.reasoning,
      last_updated = excluded.last_updated,
      last_updated_by = excluded.last_updated_by
  `).bind(
    emailId,
    userId,
    result.metadata.category,
    result.metadata.priority,
    result.metadata.actionStatus,
    JSON.stringify(result.metadata.labels),
    result.metadata.dueDate?.toISOString(),
    result.metadata.scheduledDate?.toISOString(),
    result.metadata.project,
    result.metadata.context,
    result.confidence,
    JSON.stringify(result.reasoning),
    new Date().toISOString(),
    'system'
  ).run();

  // Store in R2 for backup
  await env.CLASSIFICATION_BUCKET.put(
    `${userId}/${emailId}/classification.json`,
    JSON.stringify({
      metadata: result.metadata,
      confidence: result.confidence,
      reasoning: result.reasoning,
      timestamp: new Date().toISOString()
    })
  );
} 