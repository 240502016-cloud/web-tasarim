import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// Tembel yüklenen sayfaların ilk derlenmesi testte zaman alabilir
configure({ asyncUtilTimeout: 5000 });

// Her testten sonra ekrana çizilen bileşenleri temizle
afterEach(cleanup);
